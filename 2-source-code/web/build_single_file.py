"""Build dist/: one self-contained HTML page (styles and scripts inlined) plus the media folder.

  python web/build_single_file.py

The page loads three.js from vendor/ when a copy is there (and inlines it), otherwise from
the jsDelivr CDN at run time. The attract film (media/attract.mp4) stays a separate file
next to the page; without it the kiosk falls back to a slow orbit of the live map.
"""
import pathlib, re, shutil

here = pathlib.Path(__file__).parent
dist = here / 'dist'
dist.mkdir(exist_ok=True)
html = (here / 'index.html').read_text(encoding='utf-8')


def css(m):
    code = (here / m.group(1)).read_text(encoding='utf-8')
    if '/' in m.group(1):                     # css/photos.css: its url(../media/...) is relative to css/, the page's to web/
        code = code.replace('url(../', 'url(')
    return '<style>\n' + code + '\n</style>'


def js(m):
    src = here / m.group(1)
    if not src.exists():                      # optional modules such as js/shade.js
        return ''
    code = src.read_text(encoding='utf-8').replace('</script', '<\\/script')
    return '<script>\n' + code + '\n</script>'


# "?v=6.3" on the links in index.html only stops browsers serving stale files from the dev server
html = re.sub(r'<link rel="stylesheet" href="([^"?]+\.css)(?:\?[^"]*)?">', css, html)
html = re.sub(r'<script src="([^"?]+\.js)(?:\?[^"]*)?"(?: onerror="[^"]*")?></script>', js, html)
vendor = [here / 'vendor' / 'three.min.js', here / 'vendor' / 'OrbitControls.js']
if all(v.exists() for v in vendor):
    three = ''.join('<script>\n' + v.read_text(encoding='utf-8') + '\n</script>\n' for v in vendor)
    html = html.replace('<script>\n/* ============================================================\n   ENGINE', three + '<script>\n/* ============================================================\n   ENGINE', 1)
out = dist / 'ireo-boulevard.html'
out.write_text(html, encoding='utf-8')
if (here / 'media').exists():
    shutil.copytree(here / 'media', dist / 'media', dirs_exist_ok=True)
if (here / 'manifest.webmanifest').exists():
    (dist / 'manifest.webmanifest').write_text((here / 'manifest.webmanifest').read_text(encoding='utf-8')
        .replace('"./?view=app', '"ireo-boulevard.html?view=app'), encoding='utf-8')   # the built page has its own name
print('wrote', out, round(out.stat().st_size / 1e6, 2), 'MB')
