"""Move the store photos out of css/photos.css into their own files, media/photos/<brand>.jpg.

  python web/split_photos.py

photos.css used to carry every photo as a data URI (1.2 MB), so the page could not draw anything until all of
them had arrived. As files, a photo loads only when a card that shows it appears, and the browser caches it.
The rules keep their names (.ph-<brand>); PHOTOS in assets.js still lists which brands have one. Safe to run again:
photos that are files already are left alone. To add a photo, put media/photos/<brand>.jpg in place and add its
rule to photos.css and the brand to PHOTOS.
"""
import base64, pathlib, re

here = pathlib.Path(__file__).parent
css_path = here / 'css' / 'photos.css'
out = here / 'media' / 'photos'
out.mkdir(parents=True, exist_ok=True)
css = css_path.read_text(encoding='utf-8')
EXT = {'jpeg': 'jpg', 'jpg': 'jpg', 'png': 'png', 'webp': 'webp'}
n = 0


def to_file(m):
    global n
    brand, kind, data = m.group(1), m.group(2), m.group(3)
    name = f'{brand}.{EXT[kind]}'
    (out / name).write_bytes(base64.b64decode(data))
    n += 1
    return f'.ph-{brand}{{background-image:url(../media/photos/{name})}}'


css = re.sub(r'\.ph-([a-z0-9_-]+)\{background-image:url\(data:image/(\w+);base64,([A-Za-z0-9+/=]+)\)\}', to_file, css)
css = css.replace('/* Store photos from ireoboulevard.com, as data URIs (class .ph-<brand>). */',
                  '/* Store photos from ireoboulevard.com (class .ph-<brand>), files in media/photos (split_photos.py). */')
css_path.write_text(css, encoding='utf-8', newline='\n')
print('moved', n, 'photos to', out, '- photos.css is now', css_path.stat().st_size, 'bytes')
