/* QR code tests: node tests/qr.test.js
   Every code is read back by a small decoder written from the standard's own tables (block sizes, alignment
   positions), not from the encoder: format bits must be a valid BCH word in both copies, every block's
   Reed-Solomon syndromes must be zero, and the byte-mode text must come back exactly. */
const assert = require('assert');
const { qrMatrix, qrSVG } = require('../web/js/qr.js');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('  ok  ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + e.message); } }

/* ISO/IEC 18004, level M: [blocks, total codewords per block, data codewords per block] groups; alignment centres */
const BLOCKS_M = { 1: [[1, 26, 16]], 2: [[1, 44, 28]], 3: [[1, 70, 44]], 4: [[2, 50, 32]], 5: [[2, 67, 43]], 6: [[4, 43, 27]],
  7: [[4, 49, 31]], 8: [[2, 60, 38], [2, 61, 39]], 9: [[3, 58, 36], [2, 59, 37]], 10: [[4, 69, 43], [1, 70, 44]] };
const ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };
const EXP = [], LOG = []; for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11D; }
const gmul = (a, b) => a && b ? EXP[(LOG[a] + LOG[b]) % 255] : 0;
function bch(data, poly, deg) { let r = data << deg; for (let i = 31; i >= deg; i--) if (r >>> i & 1) r ^= poly << (i - deg); return r; }

function decode(q) {
  const n = q.size, v = (n - 17) / 4; assert(Number.isInteger(v) && v >= 1 && v <= 10, 'size ' + n);
  const D = (x, y) => q.dark(x, y);
  // the finder patterns: dark 7x7 ring, light ring, dark 3x3 centre, light separator
  for (const [cx, cy] of [[3, 3], [n - 4, 3], [3, n - 4]]) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    const d = Math.max(Math.abs(dx), Math.abs(dy)); assert.strictEqual(D(cx + dx, cy + dy), d !== 2, 'finder at ' + cx + ',' + cy); }
  for (let i = 8; i < n - 8; i++) { assert.strictEqual(D(i, 6), i % 2 === 0, 'timing row'); assert.strictEqual(D(6, i), i % 2 === 0, 'timing column'); }
  assert(D(8, n - 8), 'the dark module');
  // format information: both copies, a valid (ECC level, mask) BCH word
  const f1 = [], f2 = [];
  for (let i = 0; i <= 5; i++) f1.push(D(8, i)); f1.push(D(8, 7), D(8, 8), D(7, 8)); for (let i = 9; i < 15; i++) f1.push(D(14 - i, 8));
  for (let i = 0; i < 8; i++) f2.push(D(n - 1 - i, 8)); for (let i = 8; i < 15; i++) f2.push(D(8, n - 15 + i));
  const word = a => a.reduce((s, b, i) => s | (b ? 1 << i : 0), 0);
  assert.strictEqual(word(f1), word(f2), 'the two format copies differ');
  const raw = word(f1) ^ 0x5412, info = raw >>> 10;
  assert.strictEqual(raw & 0x3FF, bch(info, 0x537, 10), 'format BCH');
  assert.strictEqual(info >>> 3, 0, 'level M'); const mask = info & 7;
  if (v >= 7) { let vb = 0; for (let i = 0; i < 18; i++) if (D(n - 11 + i % 3, Math.floor(i / 3))) vb |= 1 << i;
    assert.strictEqual(vb >>> 12, v, 'version info'); assert.strictEqual(vb & 0xFFF, bch(v, 0x1F25, 12), 'version BCH'); }
  // which modules carry data
  const fn = []; for (let y = 0; y < n; y++) fn.push(new Array(n).fill(false));
  const mark = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (x >= 0 && y >= 0 && x < n && y < n) fn[y][x] = true; };
  mark(0, 0, 9, 9); mark(n - 8, 0, 8, 9); mark(0, n - 8, 9, 8); mark(6, 0, 1, n); mark(0, 6, n, 1);
  const A = ALIGN[v], L = A.length - 1;                         // all but the three that would sit on a finder pattern
  A.forEach((ax, i) => A.forEach((ay, j) => { if (i === 0 && j === 0 || i === 0 && j === L || i === L && j === 0) return; mark(ax - 2, ay - 2, 5, 5); }));
  if (v >= 7) { mark(n - 11, 0, 3, 6); mark(0, n - 11, 6, 3); }
  const MASK = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x, y) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
    (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0];
  // read the codewords: two-module columns from the right, up then down, skipping the timing column
  const bits = [];
  for (let right = n - 1; right > 0; right -= 2) { if (right === 6) right--; const up = ((n - 1 - right) >> 1) % 2 === 0;
    for (let k = 0; k < n; k++) { const y = up ? n - 1 - k : k; for (const x of [right, right - 1]) if (!fn[y][x]) bits.push(D(x, y) !== MASK[mask](x, y) ? 1 : 0); } }
  const total = BLOCKS_M[v].reduce((s, [c, tot]) => s + c * tot, 0);
  const cw = []; for (let i = 0; i + 8 <= bits.length && cw.length < total; i += 8) cw.push(bits.slice(i, i + 8).reduce((s, b) => s << 1 | b, 0));
  assert.strictEqual(cw.length, total, 'codeword count');
  // de-interleave and check every block
  const blocks = []; BLOCKS_M[v].forEach(([c, tot, dat]) => { for (let i = 0; i < c; i++) blocks.push({ dat, ec: tot - dat, d: [], e: [] }); });
  let k = 0; const maxD = Math.max(...blocks.map(b => b.dat));
  for (let i = 0; i < maxD; i++) blocks.forEach(b => { if (i < b.dat) b.d.push(cw[k++]); });
  for (let i = 0; i < blocks[0].ec; i++) blocks.forEach(b => b.e.push(cw[k++]));
  blocks.forEach((b, bi) => { const all = b.d.concat(b.e);
    for (let s = 0; s < b.ec; s++) { let acc = 0; for (const c of all) acc = gmul(acc, EXP[s]) ^ c; assert.strictEqual(acc, 0, 'block ' + bi + ' syndrome ' + s); } });
  const data = [].concat(...blocks.map(b => b.d));
  const dbits = []; data.forEach(c => { for (let i = 7; i >= 0; i--) dbits.push(c >> i & 1); });
  let p = 0; const take = m => { let x = 0; for (let i = 0; i < m; i++) x = x << 1 | dbits[p++]; return x; };
  assert.strictEqual(take(4), 4, 'byte mode'); const len = take(v < 10 ? 8 : 16); const out = []; for (let i = 0; i < len; i++) out.push(take(8));
  return { text: Buffer.from(out).toString('utf8'), version: v, mask };
}

const LINK = 'https://example.trycloudflare.com/?view=app&at=G,374,699&to=bellagio&lang=en';
t('a short word', () => { const r = decode(qrMatrix('IREO')); assert.strictEqual(r.text, 'IREO'); assert.strictEqual(r.version, 1); });
t('a kiosk link: the route from this kiosk', () => assert.strictEqual(decode(qrMatrix(LINK)).text, LINK));
t('the general link: the map from this kiosk', () => { const s = 'http://192.168.1.20:8765/?view=app&at=F,512,640&heading=90&lang=hi'; assert.strictEqual(decode(qrMatrix(s)).text, s); });
t('Hindi text survives as UTF-8', () => { const s = 'आयरियो बुलेवार्ड'; assert.strictEqual(decode(qrMatrix(s)).text, s); });
t('every version 1-10, both block layouts, all masks in use', () => { const masks = new Set(), vers = new Set();
  for (let len = 1; len <= 210; len += 3) { const s = Array.from({ length: len }, (_, i) => String.fromCharCode(33 + (i * 7 + len) % 90)).join('');
    const r = decode(qrMatrix(s)); assert.strictEqual(r.text, s, 'length ' + len); masks.add(r.mask); vers.add(r.version); }
  assert.strictEqual(vers.size, 10, 'versions ' + [...vers]); assert(masks.size >= 4, 'masks ' + [...masks]); });
t('the smallest version that fits', () => { assert.strictEqual(decode(qrMatrix('x'.repeat(14))).version, 1); assert.strictEqual(decode(qrMatrix('x'.repeat(15))).version, 2); });
t('too long is refused, not cut short', () => assert.throws(() => qrMatrix('x'.repeat(300)), /too long/));
t('the SVG has a quiet zone and one path', () => { const s = qrSVG('IREO'), n = 21 + 8; assert(s.includes(`viewBox="0 0 ${n} ${n}"`)); assert.strictEqual((s.match(/<path/g) || []).length, 1); });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
