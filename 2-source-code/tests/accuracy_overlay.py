"""Draw the product's mall data (data/mall_registered.json) over each floor-plan PDF, to check the map
against the plans:  python tests/accuracy_overlay.py   ->  renders/accuracy-check-*.png   (needs PyMuPDF, Pillow)"""
import json, os
import fitz
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = json.load(open(os.path.join(ROOT, 'data', 'mall_registered.json'), encoding='utf8'))
PDF = {'G': 'Ground_Floor_Plan-_Grand_View_High_Street__2_.pdf', 'F': 'First_Floor_Plan-_Grand_View_High_Street__2_.pdf',
       'S': 'Second_Floor_Plan-_Grand_View_high_Street__3_.pdf'}
NAME = {'G': 'ground-floor', 'F': 'first-floor', 'S': 'second-floor'}
K = 2.0
font = lambda s: ImageFont.truetype(os.path.join(ROOT, 'blender', 'Inter-SemiBold.ttf'), s)
pts = lambda o: o['p'] if 'p' in o else [[o['r'][0], o['r'][1]], [o['r'][2], o['r'][1]], [o['r'][2], o['r'][3]], [o['r'][0], o['r'][3]]]
rect = lambda r: [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]]

for f, pdf in PDF.items():
    page = fitz.open(os.path.join(ROOT, 'floor-plans', pdf))[0]
    pix = page.get_pixmap(matrix=fitz.Matrix(K, K))
    base = Image.frombytes('RGB', (pix.width, pix.height), pix.samples).convert('RGBA')
    lay = Image.new('RGBA', base.size, (0, 0, 0, 0))
    g = ImageDraw.Draw(lay)
    T = lambda P: [(x * K, y * K) for x, y in P]
    F = D['FLOORS'][f]
    for r in F.get('walks', []):
        g.polygon(T(rect(r)), fill=(29, 61, 48, 40))
    for t in F.get('terraces', []):
        g.polygon(T(pts(t)), fill=(184, 144, 79, 45))
    for u in F['units']:
        g.polygon(T(pts(u)), fill=(184, 144, 79, 70) if u.get('b') else (140, 140, 140, 60), outline=(29, 61, 48, 255), width=3)
    for c in F['cores']:
        g.polygon(T(pts(c)), outline=(212, 52, 44, 255), width=3)
    for t in F['toilets']:
        g.polygon(T(rect(t['r'])), outline=(31, 95, 110, 255), width=3)
    for s in F['segs']:
        g.line([(s[0] * K, s[1] * K), (s[2] * K, s[3] * K)], fill=(212, 52, 44, 200), width=3)
    for e in F.get('entrances', []):
        g.ellipse([e['x'] * K - 9, e['y'] * K - 9, e['x'] * K + 9, e['y'] * K + 9], fill=(212, 52, 44, 255))
    for u in F['units']:
        if not u.get('b'):
            continue
        x, y = u.get('lp') or [sum(p[0] for p in pts(u)) / len(pts(u)), sum(p[1] for p in pts(u)) / len(pts(u))]
        txt = D['BRANDS'][u['b']]['name']
        w = g.textlength(txt, font=font(17))
        g.rectangle([x * K - w / 2 - 5, y * K - 12, x * K + w / 2 + 5, y * K + 12], fill=(29, 61, 48, 235))
        g.text((x * K - w / 2, y * K - 11), txt, font=font(17), fill=(255, 255, 255, 255))
    out = Image.alpha_composite(base, lay).convert('RGB')
    head = Image.new('RGB', (out.width, 150), (255, 255, 255))
    hg = ImageDraw.Draw(head)
    hg.text((40, 22), F['name'] + ': the live map drawn over your floor plan', font=font(44), fill=(29, 61, 48))
    hg.text((40, 92), 'Gold = named shop   Grey = empty unit   Green tint = walkway   Red = lift/stair cores and walking routes   Teal = toilets',
            font=font(22), fill=(94, 106, 98))
    full = Image.new('RGB', (out.width, out.height + 150), (255, 255, 255))
    full.paste(head, (0, 0)); full.paste(out, (0, 150))
    full.thumbnail((1600, 2600))
    p = os.path.join(ROOT, 'renders', 'accuracy-check-%s.png' % NAME[f])
    full.save(p, optimize=True)
    print('wrote', p, full.size)
