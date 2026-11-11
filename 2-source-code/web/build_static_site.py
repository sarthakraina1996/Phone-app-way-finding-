"""Build the static website copy of Wayezy, for GitHub Pages (or any static host): the web app only, no server.

  python web/build_static_site.py [OUT]        (default: wayezy-site next to the project folder)

Without node server.js the app runs on each visitor's own device (datastore.js LocalDB): the kiosk, the phone app
and the admin hub all work, with the sample data, and stay in sync between tabs of one browser. Member sign-in,
live sync between devices and the admin password need the server (DEPLOY.md). <html data-host="static"> tells the
page so: it skips looking for the server, and the admin hub (no sign-in there) plays its intro on open.
OUT keeps its .git folder (the GitHub repository) and README; everything else in it is replaced.
"""
import pathlib, re, shutil, sys

here = pathlib.Path(__file__).parent
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else here.parent.parent / 'wayezy-site'
out.mkdir(parents=True, exist_ok=True)
for p in out.iterdir():                                   # a clean copy, keeping the repository itself
    if p.name in ('.git', 'README.md'):
        continue
    shutil.rmtree(p) if p.is_dir() else p.unlink()

html = (here / 'index.html').read_text(encoding='utf-8')
html, n = re.subn(r'<html lang="en">', '<html lang="en" data-host="static">', html, count=1)
assert n == 1, 'index.html: no <html lang="en"> tag'
(out / 'index.html').write_text(html, encoding='utf-8')
for f in ('styles.css', 'manifest.webmanifest', 'sw.js'):
    shutil.copy2(here / f, out / f)
for d in ('css', 'js', 'media'):
    shutil.copytree(here / d, out / d)
(out / '.nojekyll').write_text('', encoding='utf-8')     # GitHub Pages: serve the files as they are
if not (out / 'README.md').exists():
    (out / 'README.md').write_text(
        '# Wayezy\n\n3D wayfinding for malls and venues by BrainADZ Live: in-mall kiosk, phone app and admin hub.\n\n'
        'Open `index.html?view=kiosk`, `?view=app` or `?view=admin`. This is the static demo (sample data, kept on '
        'each visitor\'s device); it is built from the Wayezy project with `python web/build_static_site.py`.\n',
        encoding='utf-8')
size = sum(p.stat().st_size for p in out.rglob('*') if p.is_file() and '.git' not in p.parts)
print('wrote', out, round(size / 1e6, 1), 'MB')
