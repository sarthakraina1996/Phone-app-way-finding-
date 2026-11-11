"""Build the product's mall data (data/mall_registered.json and web/js/data.js) from the PDF tracing.

The three floor-plan PDFs share one drawing frame: the lift shafts sit at the same page coordinates on
every floor (Lifts C and D within about 1.3 m; Lift E and the Second-floor anchor lifts within about
4 m, and the PDFs call their drawings an artistic impression), and 1 PDF point is 0.16 m on all three. So every floor is used exactly as traced in data/mall_plan_coordinates.json,
with no per-floor warping. (Until 27 Sept 2026 the Ground and Second floors were warped in blocks so
their shops lined up with the First floor's; that version is kept as mall_registered_warped_v5.json.)

What the PDFs show, and the map now keeps:
  - Ground floor: the shops stand back from the central street, so the boulevard is 94 pt (15 m) wide
    at ground level against 64 pt (10 m) on the First floor, which overhangs it.
  - Second floor: its two bridges and terraces sit where the Second-floor PDF draws them (street 101 pt).
Added on top of the tracing (not in the PDFs): the main entrance at the south end of the central street
and the short walk from it to the street's west lane.

  python data/align_to_pdfs.py
"""
import json, os, copy

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
P = json.load(open(os.path.join(HERE, 'mall_plan_coordinates.json'), encoding='utf8'))
OLD = os.path.join(HERE, 'mall_registered.json')
BACKUP = os.path.join(HERE, 'mall_registered_warped_v5.json')
prev = json.load(open(OLD, encoding='utf8'))
if not os.path.exists(BACKUP):
    json.dump(prev, open(BACKUP, 'w', encoding='utf8'), ensure_ascii=False)

VB = [100, 40, 650, 1170]                 # one view box for every floor, so switching floors never jumps
out = {'CATS': prev['CATS'], 'BRANDS': prev['BRANDS'], 'FLOOR_ORDER': P['FLOOR_ORDER'], 'FLOORS': {}, 'CONNECTORS': copy.deepcopy(P['CONNECTORS']), 'VB': VB}
for f in P['FLOOR_ORDER']:
    F = copy.deepcopy(P['FLOORS'][f])
    F['vb'] = VB
    out['FLOORS'][f] = F

# main entrance: centred on the ground-floor street (shops at x 350 and 444), just south of the paving
G = out['FLOORS']['G']
street = (350 + 444) / 2
lane_x = next(s[0] for s in G['segs'] if s[0] == s[2] and s[1] <= 700 <= s[3] and 350 < s[0] < 396)   # the street's west walking lane
south = max(s[1] for s in G['segs'] if s[1] == s[3])                                                  # the southernmost cross walk
ent_y = G['paving'][3] + 8
G['segs'].append([lane_x, south, lane_x, ent_y])
G['entrances'] = [{'id': 'main', 'name': 'Main entrance', 'x': street, 'y': ent_y}]

json.dump(out, open(OLD, 'w', encoding='utf8'), ensure_ascii=False)
data = {k: out[k] for k in ('CATS', 'BRANDS', 'FLOOR_ORDER', 'FLOORS', 'CONNECTORS')}
js = ('/* Mall model: floor plans traced from the Grand View High Street PDFs, all floors in the PDFs\' shared\n'
      '   drawing frame (see data/align_to_pdfs.py). Generated data - edit the JSON and re-run that script, not this file. */\n'
      'const DATA=' + json.dumps(data, ensure_ascii=False) + ';\n')
open(os.path.join(ROOT, 'web', 'js', 'data.js'), 'w', encoding='utf8').write(js)
print('lane x', lane_x, 'south walk y', south, 'entrance', G['entrances'][0])
print('wrote data/mall_registered.json and web/js/data.js')
