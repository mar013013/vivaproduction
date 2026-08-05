'use strict';

const CENTER=[45.0355,38.9753];
const STORAGE_KEY='mishka_demo_v2';
const TTL_SECONDS=2700;
const NOTIFICATION_PREF='mishka_notifications_enabled_v1';
const LEVELS={
  1:{name:'Обычный',color:'#53b985'},
  2:{name:'Бронзовый',color:'#bd7a43'},
  3:{name:'Серебряный',color:'#9aa8bb'},
  4:{name:'Золотой',color:'#f3b63f'},
  5:{name:'Легендарный',color:'#d56ef4'}
};
const state={markers:new Map(),bears:new Map(),adding:false,pending:null,tempMarker:null,userMarker:null,installPrompt:null,selectedLevel:1};
const $=id=>document.getElementById(id);
const ui={
  status:$('onlineStatus'),add:$('addButton'),locate:$('locateButton'),refresh:$('refreshButton'),toast:$('toast'),
  backdrop:$('sheetBackdrop'),bearSheet:$('bearSheet'),bearContent:$('bearSheetContent'),createSheet:$('createSheet'),
  profileSheet:$('profileSheet'),note:$('bearNote'),coords:$('selectedCoordinates'),publish:$('confirmCreateButton'),
  profile:$('profileButton'),nickname:$('nicknameInput'),saveProfile:$('saveProfileButton'),install:$('installButton'),
  notify:$('notificationButton'),notifyStatus:$('notificationStatus'),levelSelector:$('levelSelector')
};

const map=L.map('map',{zoomControl:false,attributionControl:false,preferCanvas:true}).setView(CENTER,12);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{
  subdomains:'abcd',maxZoom:20,minZoom:3,crossOrigin:true
}).addTo(map);

function uid(){return crypto.randomUUID?crypto.randomUUID():'b'+Date.now()+Math.random().toString(16).slice(2)}
function player(){let name=localStorage.mishka_name;if(!name){name='Игрок '+Math.floor(1000+Math.random()*9000);localStorage.mishka_name=name}return name}
function normalizeBear(b){const level=Number(b.level);return{...b,level:LEVELS[level]?level:1,yes:Number(b.yes)||0,no:Number(b.no)||0,comments:Array.isArray(b.comments)?b.comments:[]}}
function seed(){const t=Date.now()/1000;return[
  {id:uid(),lat:45.0417,lng:38.9759,level:4,note:'Золотой мишка возле фонтана',author:'Лесник',created:t-240,expires:t+2100,yes:7,no:0,comments:[{author:'Маша',text:'Только что видела!',time:t-80}]},
  {id:uid(),lat:45.0282,lng:38.9681,level:2,note:'Бронзовый мишка у дерева',author:'Игрок 2048',created:t-900,expires:t+1500,yes:3,no:1,comments:[]},
  {id:uid(),lat:45.0521,lng:39.0035,level:5,note:'Легендарный ночной мишка',author:'Сова',created:t-1500,expires:t+700,yes:11,no:2,comments:[]}
]}
function load(){let items;try{items=JSON.parse(localStorage.getItem(STORAGE_KEY))}catch(e){}if(!Array.isArray(items))items=seed();items=items.map(normalizeBear).filter(x=>x.expires>Date.now()/1000);localStorage.setItem(STORAGE_KEY,JSON.stringify(items));return items}
function save(items){localStorage.setItem(STORAGE_KEY,JSON.stringify(items.map(normalizeBear)))}
function esc(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toast(message){ui.toast.textContent=message;ui.toast.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>ui.toast.classList.remove('show'),2500)}
function ago(time){const minutes=Math.floor((Date.now()/1000-time)/60);return minutes<1?'только что':minutes<60?minutes+' мин назад':Math.floor(minutes/60)+' ч назад'}
function remain(time){return Math.max(0,Math.ceil((time-Date.now()/1000)/60))+' мин'}
function levelMeta(level){return LEVELS[level]||LEVELS[1]}
function markerIcon(bear){const level=levelMeta(bear.level);const old=(Date.now()/1000-bear.created)>1500?' old':'';return L.divIcon({className:'',html:`<div class="bear-marker${old}" style="--marker-color:${level.color}"><span>🐻</span><span class="level-badge">${bear.level}</span></div>`,iconSize:[52,52],iconAnchor:[26,47]})}
function sync(){const items=load();const incoming=new Set();state.bears.clear();items.forEach(bear=>{incoming.add(bear.id);state.bears.set(bear.id,bear);let marker=state.markers.get(bear.id);if(!marker){marker=L.marker([bear.lat,bear.lng],{icon:markerIcon(bear)}).addTo(map).on('click',()=>openBear(bear.id));state.markers.set(bear.id,marker)}else marker.setIcon(markerIcon(bear))});for(const [id,marker] of state.markers){if(!incoming.has(id)){map.removeLayer(marker);state.markers.delete(id)}}ui.status.textContent=items.length+' мишек · 5 уровней'}
function showSheet(sheet){[ui.bearSheet,ui.createSheet,ui.profileSheet].forEach(x=>x.classList.add('hidden'));sheet.classList.remove('hidden');ui.backdrop.classList.remove('hidden')}
function closeSheets(){[ui.bearSheet,ui.createSheet,ui.profileSheet].forEach(x=>x.classList.add('hidden'));ui.backdrop.classList.add('hidden')}
document.querySelectorAll('[data-close-sheet]').forEach(x=>x.addEventListener('click',closeSheets));ui.backdrop.addEventListener('click',closeSheets);
function setSelectedLevel(level){state.selectedLevel=LEVELS[level]?level:1;ui.levelSelector.querySelectorAll('[data-level]').forEach(button=>{const selected=Number(button.dataset.level)===state.selectedLevel;button.classList.toggle('selected',selected);button.setAttribute('aria-checked',selected?'true':'false')})}
ui.levelSelector.querySelectorAll('[data-level]').forEach(button=>button.addEventListener('click',()=>setSelectedLevel(Number(button.dataset.level))));
function levelChip(level){const meta=levelMeta(level);return `<div class="level-chip"><i style="background:${meta.color}">${level}</i><span>Уровень ${level} · ${meta.name}</span></div>`}
function openBear(id){const bear=state.bears.get(id);if(!bear)return;const comments=bear.comments||[];ui.bearContent.innerHTML=`
  <h2>🐻 Мишка на месте?</h2>
  ${levelChip(bear.level)}
  <p class="muted">${ago(bear.created)} · ещё ${remain(bear.expires)}</p>
  ${bear.note?`<div class="info-card">${esc(bear.note)}</div>`:''}
  <div class="stats"><div class="stat"><strong>${bear.yes}</strong><span>есть</span></div><div class="stat"><strong>${bear.no}</strong><span>ушёл</span></div><div class="stat"><strong>${comments.length}</strong><span>сообщений</span></div></div>
  <div class="button-row"><button class="button primary" data-vote="yes">🐻 Есть</button><button class="button danger" data-vote="no">Уже ушёл</button></div>
  <div class="button-row"><button class="button secondary" id="routeButton">Маршрут к мишке</button><button class="button secondary" id="shareButton">Поделиться</button></div>
  <h3>Обсуждение</h3>
  <div>${comments.length?comments.map(c=>`<div class="comment"><b>${esc(c.author)}</b><small>${ago(c.time)}</small><p>${esc(c.text)}</p></div>`).join(''):'<p class="muted">Пока сообщений нет.</p>'}</div>
  <form id="commentForm" class="comment-form"><input id="commentInput" maxlength="240" placeholder="Написать сообщение"><button>➤</button></form>`;
  showSheet(ui.bearSheet);
  ui.bearContent.querySelectorAll('[data-vote]').forEach(button=>button.addEventListener('click',()=>vote(id,button.dataset.vote)));
  $('routeButton').addEventListener('click',()=>window.open('https://www.google.com/maps/dir/?api=1&destination='+bear.lat+','+bear.lng,'_blank'));
  $('shareButton').addEventListener('click',async()=>{const text=`Игровой мишка: уровень ${bear.level}, ${bear.lat.toFixed(5)}, ${bear.lng.toFixed(5)}`;if(navigator.share)await navigator.share({title:'Мишка рядом',text});else{await navigator.clipboard.writeText(text);toast('Скопировано')}});
  $('commentForm').addEventListener('submit',event=>{event.preventDefault();const text=$('commentInput').value.trim();if(text.length<2)return;const items=load();const item=items.find(x=>x.id===id);if(!item)return;item.comments.push({author:player(),text,time:Date.now()/1000});save(items);sync();openBear(id)})
}
function vote(id,type){const items=load();const bear=items.find(x=>x.id===id);if(!bear)return;bear[type]++;if(type==='no'&&bear.no>=3&&bear.no>bear.yes+1){bear.expires=0;closeSheets();toast('Метка скрыта')}else toast(type==='yes'?'Мишка подтверждён':'Отметка обновлена');save(items);sync();if(bear.expires>0)openBear(id)}
ui.add.addEventListener('click',()=>{state.adding=!state.adding;ui.add.classList.toggle('active',state.adding);ui.add.innerHTML=state.adding?'× Отменить выбор':'<span>＋</span> Поставить мишку';map.getContainer().style.cursor=state.adding?'crosshair':'';if(state.adding)toast('Нажми на место на карте')});
map.on('click',event=>{if(!state.adding)return;state.pending=event.latlng;setSelectedLevel(1);if(state.tempMarker)map.removeLayer(state.tempMarker);state.tempMarker=L.marker(event.latlng,{icon:L.divIcon({className:'',html:'<div class="pending-pin"></div>',iconSize:[42,42],iconAnchor:[14,40]})}).addTo(map);ui.note.value='';ui.coords.textContent=event.latlng.lat.toFixed(5)+', '+event.latlng.lng.toFixed(5);showSheet(ui.createSheet)});
ui.publish.addEventListener('click',async()=>{if(!state.pending)return;const t=Date.now()/1000;const items=load();const selectedLevel=state.selectedLevel;const meta=levelMeta(selectedLevel);items.unshift({id:uid(),lat:state.pending.lat,lng:state.pending.lng,level:selectedLevel,note:ui.note.value.trim().slice(0,120),author:player(),created:t,expires:t+TTL_SECONDS,yes:1,no:0,comments:[]});save(items);closeSheets();state.adding=false;ui.add.classList.remove('active');ui.add.innerHTML='<span>＋</span> Поставить мишку';if(state.tempMarker)map.removeLayer(state.tempMarker);state.tempMarker=null;state.pending=null;sync();toast(`${meta.name} мишка опубликован`);await testNotify(`🐻 ${meta.name} мишка опубликован`,`На карте появилась игровая точка уровня ${selectedLevel}.`)});
ui.locate.addEventListener('click',()=>{if(!navigator.geolocation)return toast('Геолокация не поддерживается');navigator.geolocation.getCurrentPosition(position=>{const point=[position.coords.latitude,position.coords.longitude];map.setView(point,15);if(state.userMarker)map.removeLayer(state.userMarker);state.userMarker=L.marker(point,{icon:L.divIcon({className:'',html:'<div class="user-dot"></div>',iconSize:[22,22],iconAnchor:[11,11]})}).addTo(map)},()=>toast('Разреши доступ к геопозиции'),{enableHighAccuracy:true,timeout:9000})});
ui.refresh.addEventListener('click',()=>{sync();toast('Карта обновлена')});
ui.profile.addEventListener('click',()=>{ui.nickname.value=player();showSheet(ui.profileSheet)});
ui.saveProfile.addEventListener('click',()=>{const name=ui.nickname.value.trim().replace(/\s+/g,' ').slice(0,28);if(name.length<2)return toast('Введите имя');localStorage.mishka_name=name;toast('Имя сохранено');closeSheets()});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();state.installPrompt=event});
ui.install.addEventListener('click',async()=>{if(state.installPrompt){state.installPrompt.prompt();await state.installPrompt.userChoice;state.installPrompt=null}else toast(/iphone|ipad|ipod/i.test(navigator.userAgent)?'Safari → Поделиться → На экран Домой':'Меню браузера → Установить')});
async function testNotify(title='🐻 Мишка рядом',body='Тестовое уведомление работает!'){if(!('Notification'in window)||!('serviceWorker'in navigator))return toast('Уведомления не поддерживаются');try{const permission=await Notification.requestPermission();if(permission!=='granted'){localStorage.removeItem(NOTIFICATION_PREF);ui.notifyStatus.textContent='Уведомления не разрешены.';return}localStorage.setItem(NOTIFICATION_PREF,'1');const registration=await navigator.serviceWorker.ready;await registration.showNotification(title,{body,icon:'./icon.svg',badge:'./icon.svg',tag:'mishka-test',renotify:true,data:{url:'./'}});ui.notifyStatus.textContent='Уведомления включены. Проверочное уведомление отправлено.';toast('Уведомление отправлено')}catch(e){ui.notifyStatus.textContent='На iPhone сначала добавь сайт на экран Домой.';toast('Сначала установи приложение')}}
function refreshNotificationState(){if(!('Notification'in window)){ui.notifyStatus.textContent='Этот браузер не поддерживает уведомления.';return}if(Notification.permission==='granted'&&localStorage.getItem(NOTIFICATION_PREF)==='1')ui.notifyStatus.textContent='Уведомления включены.';else if(Notification.permission==='denied')ui.notifyStatus.textContent='Уведомления запрещены в настройках iPhone.'}
ui.notify.addEventListener('click',()=>testNotify());
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
sync();refreshNotificationState();setInterval(sync,15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
