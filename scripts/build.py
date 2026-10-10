#!/usr/bin/env python3
"""Build a dependency-free, self-contained SUMMIT application."""
import argparse
import base64
import json
from pathlib import Path
from versioning import stamp

ROOT = Path(__file__).resolve().parents[1]
SRC, DOCS = ROOT / 'src', ROOT / 'docs'

def data_uri(name):
    return 'data:image/png;base64,' + base64.b64encode((DOCS / 'assets' / name).read_bytes()).decode()

def build(export=None):
    research = json.loads((ROOT / 'sources.json').read_text())
    assert len(research['peaks']) == 14
    data = (SRC / 'data.js').read_text().replace('/*__RESEARCH__*/', json.dumps(research, ensure_ascii=False).replace('<', '\\u003c'))
    parts = {
        '/*__CSS__*/': '\n'.join((SRC / name).read_text() for name in ['style.css','comfort.css','updater.css']),
        '__ICON__': data_uri('mark-96.png'),
        '<!--__QR__-->': (DOCS / 'assets' / 'qr.svg').read_text(),
        '/*__DATA__*/': data,
        '/*__DRAWINGS__*/': (SRC / 'diagrams.js').read_text(),
        '/*__LEARNING__*/': (SRC / 'learning.js').read_text(),
        '/*__APP__*/': (SRC / 'app.js').read_text(),
        '/*__UPDATER__*/': (SRC / 'updater.js').read_text(),
    }
    html = (SRC / 'shell.html').read_text()
    for placeholder, value in parts.items():
        assert placeholder in html, placeholder
        html = html.replace(placeholder, value)
    html = stamp(html, 'summit', DOCS)
    (DOCS / 'index.html').write_text(html)
    offline = html.replace('<link rel="manifest" href="site.webmanifest">', '')
    for name in ['favicon-32.png', 'apple-touch-icon.png']:
        offline = offline.replace('href="assets/' + name + '"', 'href="' + data_uri(name) + '"')
    offline = offline.replace('<a href="SUMMIT.html" download class="secondary-button">Скачать для офлайн-чтения ↓</a>', '<p>Вы открыли автономную копию атласа.</p>')
    (DOCS / 'SUMMIT.html').write_text(offline)
    (DOCS / '.nojekyll').touch()
    if export:
        export.mkdir(parents=True, exist_ok=True)
        (export / 'SUMMIT.html').write_text(offline)
    print(f'Built {len(html.encode()):,} bytes; 14 peaks, 42 recall cards.')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--export', type=Path)
    build(parser.parse_args().export)
