"""Fruktodar storefront and owner-managed 24-hour stories. Python 3.11+, FFmpeg."""
import hashlib,hmac,json,mimetypes,os,re,shutil,sqlite3,subprocess,tempfile,threading,time,uuid
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit,unquote

ROOT=Path(__file__).resolve().parents[1]
DATA=Path(os.environ.get('STORIES_DATA_DIR','/tmp/fruktodar-stories')).resolve()
MAX_UPLOAD=25*1024*1024
TOKEN=os.environ.get('STORIES_ADMIN_TOKEN','')
ALLOWED_ORIGIN=os.environ.get('STORIES_ALLOWED_ORIGIN','').rstrip('/')

def connection():
    c=sqlite3.connect(DATA/'stories.sqlite',timeout=10);c.row_factory=sqlite3.Row;return c

def initialize():
    if len(TOKEN)<32:raise RuntimeError('Set STORIES_ADMIN_TOKEN to a secret of at least 32 characters.')
    for binary in ['ffprobe','ffmpeg']:
        if not shutil.which(binary):raise RuntimeError(binary+' is required')
    DATA.mkdir(parents=True,exist_ok=True);(DATA/'media').mkdir(exist_ok=True)
    with connection() as c:c.execute('CREATE TABLE IF NOT EXISTS stories (id TEXT PRIMARY KEY,title TEXT,kind TEXT,filename TEXT,duration REAL,created REAL,expires REAL)')

def cleanup():
    with connection() as c:
        rows=c.execute('SELECT * FROM stories WHERE expires<=?',(time.time(),)).fetchall()
        for r in rows:(DATA/'media'/r['filename']).unlink(missing_ok=True)
        c.execute('DELETE FROM stories WHERE expires<=?',(time.time(),))

def probe(file):
    result=subprocess.run(['ffprobe','-v','error','-protocol_whitelist','file,pipe','-show_streams','-show_format','-of','json',str(file)],capture_output=True,timeout=12,check=True)
    return json.loads(result.stdout)

def prepare_media(content,mime,destination):
    image=(mime in ['image/jpeg','image/png','image/webp'])
    if not image and mime not in ['video/mp4','video/quicktime','video/webm']:raise ValueError('Поддерживаются JPG, PNG, WebP, MP4, MOV и WebM.')
    with tempfile.TemporaryDirectory(dir=DATA) as folder:
        source=Path(folder)/'upload';source.write_bytes(content)
        info=probe(source);streams=[s for s in info['streams'] if s.get('codec_type')=='video']
        if not streams:raise ValueError('Не найдено изображение или видео.')
        stream=streams[0];w,h=int(stream.get('width',0)),int(stream.get('height',0))
        if w<1 or h<1 or w*h>40_000_000:raise ValueError('Неподдерживаемый размер изображения.')
        if image:
            if stream.get('codec_name') not in ['mjpeg','png','webp']:raise ValueError('Содержимое файла не совпадает с форматом изображения.')
            duration=15;ext='.jpg'
        else:
            duration=float(info.get('format',{}).get('duration') or stream.get('duration') or 0)
            if not 0<duration<=15.05:raise ValueError('Видео должно длиться не больше 15 секунд.')
            ext='.mp4'
        output=Path(str(destination)+ext)
        cmd=['ffmpeg','-nostdin','-v','error','-protocol_whitelist','file,pipe','-i',str(source),'-map_metadata','-1','-vf','scale=trunc(min(1080\\,iw)/2)*2:-2','-threads','1']
        if image:cmd+=['-frames:v','1','-q:v','3',str(output)]
        else:cmd+=['-t','15','-c:v','libx264','-preset','veryfast','-crf','24','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-movflags','+faststart',str(output)]
        try:subprocess.run(cmd,capture_output=True,check=True,timeout=45)
        except Exception:output.unlink(missing_ok=True);raise ValueError('Не удалось обработать файл. Попробуйте другой формат.')
        return output.name,'image' if image else 'video',min(15,duration)

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args):pass # Never log bearer tokens or upload metadata.
    def headers_common(self):
        self.send_header('X-Content-Type-Options','nosniff');self.send_header('Referrer-Policy','strict-origin-when-cross-origin')
        if ALLOWED_ORIGIN and self.headers.get('Origin')==ALLOWED_ORIGIN:
            self.send_header('Access-Control-Allow-Origin',ALLOWED_ORIGIN);self.send_header('Vary','Origin')
    def respond(self,status,body):
        data=json.dumps(body,ensure_ascii=False).encode();self.send_response(status);self.headers_common();self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
    def api_path(self):return urlsplit(self.path).path.removeprefix('/fruktodar-shop').rstrip('/')
    def admin(self):
        supplied=self.headers.get('Authorization','').removeprefix('Bearer ')
        if not hmac.compare_digest(supplied.encode(),TOKEN.encode()):self.respond(401,{'error':'Неверный ключ владельца.'});return False
        origin=self.headers.get('Origin')
        if origin and origin!=ALLOWED_ORIGIN and urlsplit(origin).netloc!=self.headers.get('Host'):
            self.respond(403,{'error':'Источник запроса не разрешён.'});return False
        return True
    def do_OPTIONS(self):
        if self.headers.get('Origin')!=ALLOWED_ORIGIN:self.respond(403,{'error':'Источник не разрешён.'});return
        self.send_response(204);self.headers_common();self.send_header('Access-Control-Allow-Methods','GET, POST, DELETE, OPTIONS');self.send_header('Access-Control-Allow-Headers','Authorization, Content-Type, X-Story-Title');self.end_headers()
    def do_GET(self):
        path=self.api_path()
        if path=='/api/stories' or path=='/api/stories/admin':
            if path.endswith('/admin') and not self.admin():return
            with connection() as c:rows=c.execute('SELECT * FROM stories WHERE expires>? ORDER BY created DESC',(time.time(),)).fetchall()
            self.respond(200,{'stories':[{'id':r['id'],'title':r['title'],'kind':r['kind'],'url':'media/'+r['filename'],'duration':r['duration'],'createdAt':r['created'],'expiresAt':r['expires']} for r in rows]});return
        if path.startswith('/api/stories/media/'):
            filename=path.rsplit('/',1)[-1]
            with connection() as c:row=c.execute('SELECT * FROM stories WHERE filename=? AND expires>?',(filename,time.time())).fetchone()
            if not row:self.respond(404,{'error':'История недоступна.'});return
            self.file(DATA/'media'/filename);return
        # Only frontend files are public. Database, server code and upload temp files are inaccessible.
        rel=unquote(path).lstrip('/') or 'index.html'
        if rel.endswith('/'):rel+='index.html'
        if not (rel in ['index.html','style.css','app.js','stories.js','stories.css','stories-config.js','admin.html','admin.js'] or re.fullmatch(r'assets/(?:real/)?[A-Za-z0-9_.-]+',rel)):
            self.respond(404,{'error':'Страница не найдена.'});return
        self.file(ROOT/rel)
    def file(self,path):
        if not path.is_file():self.respond(404,{'error':'Файл не найден.'});return
        size=path.stat().st_size;start,end,status=0,size-1,200
        request_range=self.headers.get('Range')
        if request_range:
            match=re.fullmatch(r'bytes=(\d+)-(\d*)',request_range)
            if not match or int(match[1])>=size:self.respond(416,{'error':'Недопустимый диапазон.'});return
            start=int(match[1]);end=min(end,int(match[2])) if match[2] else end
            if end<start:self.respond(416,{'error':'Недопустимый диапазон.'});return
            status=206
        self.send_response(status);self.headers_common();self.send_header('Content-Type',mimetypes.guess_type(path.name)[0] or 'application/octet-stream');self.send_header('Accept-Ranges','bytes');self.send_header('Content-Length',str(end-start+1));self.send_header('Cache-Control','no-store' if path.parent==DATA/'media' else 'no-cache')
        if status==206:self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
        self.end_headers()
        with path.open('rb') as f:
            f.seek(start);remaining=end-start+1
            while remaining:
                data=f.read(min(65536,remaining))
                if not data:break
                self.wfile.write(data);remaining-=len(data)
    def do_POST(self):
        if self.api_path()!='/api/stories':self.respond(404,{'error':'Страница не найдена.'});return
        if not self.admin():return
        try:length=int(self.headers.get('Content-Length','0'))
        except ValueError:length=0
        if not 0<length<=MAX_UPLOAD:self.respond(413,{'error':'Файл должен быть не больше 25 МБ.'});return
        self.connection.settimeout(60)
        content=self.rfile.read(length)
        if len(content)!=length:self.respond(400,{'error':'Файл передан не полностью.'});return
        cleanup()
        with connection() as c:count=c.execute('SELECT COUNT(*) FROM stories').fetchone()[0]
        if count>=30:self.respond(409,{'error':'Максимум 30 активных историй. Удалите ненужные.'});return
        title=unquote(self.headers.get('X-Story-Title','')).strip()[:80] or 'Фруктодар'
        story_id=uuid.uuid4().hex
        try:
            filename,kind,duration=prepare_media(content,self.headers.get('Content-Type','').split(';')[0],DATA/'media'/story_id)
            now=time.time()
            with connection() as c:c.execute('INSERT INTO stories VALUES (?,?,?,?,?,?,?)',(story_id,title,kind,filename,duration,now,now+86400))
            self.respond(201,{'id':story_id,'expiresAt':now+86400})
        except Exception as error:
            for file in (DATA/'media').glob(story_id+'*'):file.unlink(missing_ok=True)
            self.respond(400,{'error':str(error) if isinstance(error,ValueError) else 'Файл не удалось прочитать.'})
    def do_DELETE(self):
        match=re.fullmatch('/api/stories/([a-f0-9]{32})',self.api_path())
        if not match:self.respond(404,{'error':'История не найдена.'});return
        if not self.admin():return
        with connection() as c:
            row=c.execute('SELECT filename FROM stories WHERE id=?',(match[1],)).fetchone()
            if row:(DATA/'media'/row['filename']).unlink(missing_ok=True)
            c.execute('DELETE FROM stories WHERE id=?',(match[1],))
        self.respond(200,{'deleted':True})

if __name__=='__main__':
    initialize()
    def sweeper():
        while True:
            time.sleep(60)
            try:cleanup()
            except Exception:pass
    threading.Thread(target=sweeper,daemon=True).start()
    ThreadingHTTPServer((os.environ.get('HOST','127.0.0.1'),int(os.environ.get('PORT','8011'))),Handler).serve_forever()
