"""Export the Wallet as one offline HTML file, without third-party dependencies."""
from pathlib import Path
import sys

root = Path(__file__).resolve().parent
output = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('/tmp/central-bank.html')
page = (root / 'index.html').read_text()
for asset in ['services.css', 'experience.css', 'features.css']:
    page = page.replace(f'<link rel="stylesheet" href="{asset}?v=11">', '<style>' + (root / asset).read_text() + '</style>')
for asset in ['launch.js', 'vendor/jsQR.js', 'vendor/qrcode.js', 'app.js', 'features.js', 'pay.js', 'auth-ui.js']:
    page = page.replace(f'<script src="{asset}?v=11"></script>', '<script>' + (root / asset).read_text() + '</script>')
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(page)
print(f'Exported: {output} ({output.stat().st_size} bytes)')
