"""Export the Wallet as one offline HTML file, without third-party dependencies."""
from pathlib import Path
import sys

root = Path(__file__).resolve().parent
output = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('/tmp/central-bank.html')
page = (root / 'index.html').read_text()
page = page.replace('<link rel="stylesheet" href="services.css?v=4">', '<style>' + (root / 'services.css').read_text() + '</style>')
page = page.replace('<link rel="stylesheet" href="experience.css?v=4">', '<style>' + (root / 'experience.css').read_text() + '</style>')
page = page.replace('<script src="app.js?v=4"></script>', '<script>' + (root / 'app.js').read_text() + '</script>')
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(page)
print(f'Exported: {output} ({output.stat().st_size} bytes)')
