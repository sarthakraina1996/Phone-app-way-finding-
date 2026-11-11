/* Ad scheduler tests: node tests/adsched.test.js */
const assert = require('assert');
const A = require('../web/js/adsched.js');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('  ok  ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + e.message); } }
const at = (h, m) => new Date(2026, 8, 28, h, m || 0);        // Mon 28 Sept 2026
const K1 = { id: 'K1', loopSecs: 60 }, K2 = { id: 'K2', loopSecs: 30 };
const rules = {
  starbucks: { enabled: true, kiosks: ['*'], freeAds: 3, maxAds: 5, extraPrice: 1500, slots: [{ id: 's1', from: '14:00', to: '17:00', secs: 6 }, { id: 's2', from: '09:00', to: '12:00', secs: 6 }] },
  nicobar: { enabled: true, kiosks: ['K1'], freeAds: 1, maxAds: 2, slots: [{ id: 'n1', from: '13:00', to: '16:00', secs: 10 }] },
  masaba: { enabled: false, kiosks: ['*'], slots: [{ id: 'm1', from: '00:00', to: '23:59', secs: 20 }] },
  late: { enabled: true, kiosks: ['*'], slots: [{ id: 'l1', from: '22:00', to: '02:00', secs: 5, days: [1] }] },
};
const creatives = {
  a: { brand: 'starbucks', status: 'live', slots: [], createdAt: '1' }, b: { brand: 'starbucks', status: 'live', slots: ['s1'], createdAt: '2' },
  c: { brand: 'starbucks', status: 'pending', slots: [] }, d: { brand: 'nicobar', status: 'live', createdAt: '1' }, e: { brand: 'late', status: 'live' },
};

console.log('windows');
t('a slot plays only inside its window', () => { assert(A.slotLive(rules.starbucks.slots[0], at(14))); assert(A.slotLive(rules.starbucks.slots[0], at(16, 59))); assert(!A.slotLive(rules.starbucks.slots[0], at(17))); assert(!A.slotLive(rules.starbucks.slots[0], at(13, 59))); });
t('overnight windows cross midnight and keep their start day', () => { const s = rules.late.slots[0]; assert(A.slotLive(s, at(23))); assert(A.slotLive(s, new Date(2026, 8, 29, 1, 0))); assert(!A.slotLive(s, new Date(2026, 8, 29, 23, 0))); });
t('disabled stores and other kiosks are left out', () => { const k1 = A.activeSlots(rules, 'K1', at(15)).map(x => x.brand), k2 = A.activeSlots(rules, 'K2', at(15)).map(x => x.brand);
  assert.deepStrictEqual(k1, ['nicobar', 'starbucks']); assert.deepStrictEqual(k2, ['starbucks']); });

console.log('playlist');
t('9 AM-12 PM ads leave at noon and the afternoon set arrives on its own', () => {
  assert.deepStrictEqual(A.playlist(rules, creatives, 'K1', at(10), 0).map(i => i.slotId), ['s2']);
  assert.deepStrictEqual(A.playlist(rules, creatives, 'K1', at(12, 30), 0), []);
  assert.deepStrictEqual(A.playlist(rules, creatives, 'K1', at(14, 30), 0).map(i => i.slotId).sort(), ['n1', 's1']); });
t('a store\'s ads take turns, one per rotation, at the seconds it bought', () => {
  const r0 = A.playlist(rules, creatives, 'K2', at(15), 0), r1 = A.playlist(rules, creatives, 'K2', at(15), 1);
  assert.strictEqual(r0.length, 1); assert.strictEqual(r0[0].secs, 6); assert.notStrictEqual(r0[0].creativeId, r1[0].creativeId); });
t('pending ads never play', () => { const ids = [0, 1, 2, 3].flatMap(i => A.playlist(rules, creatives, 'K1', at(15), i).map(x => x.creativeId)); assert(!ids.includes('c')); });
t('an ad tied to one window stays out of the others', () => { const ids = [0, 1, 2].flatMap(i => A.playlist(rules, creatives, 'K1', at(10), i).map(x => x.creativeId)); assert(!ids.includes('b')); });
t('next change is the next window edge', () => { assert.strictEqual(A.nextChange(rules, 'K1', at(10)).getHours(), 12); assert.strictEqual(A.nextChange(rules, 'K1', at(15)).getHours(), 16); });

console.log('capacity and suggestions');
t('usage adds up every store running at the same time', () => { const u = A.usage(rules, K1, 1, 30); const b1500 = u.find(b => b.from === 15 * 60); assert.strictEqual(b1500.used, 16); assert.strictEqual(b1500.free, 44); });
t('free time is the tightest moment across the chosen kiosks', () => { assert.strictEqual(A.freeIn(rules, [K1], '13:00', '17:00', [1]), 44); assert.strictEqual(A.freeIn(rules, [K2], '14:00', '17:00', [1]), 24); assert.strictEqual(A.freeIn(rules, [K1, K2], '14:00', '17:00', [1]), 24); });
t('suggestions only offer windows with enough room and rank busy hours first', () => {
  const full = { x: { enabled: true, kiosks: ['*'], slots: [{ id: 'x', from: '18:00', to: '21:00', secs: 28 }] } };
  const s = A.suggest(full, [K2], { secs: 6, hours: 3, open: '10:00', close: '23:00' });
  assert(s.best, 'no suggestion'); assert(s.options.every(o => o.free >= 6));
  assert(!s.options.some(o => A.toMin(o.from) < 21 * 60 && A.toMin(o.to) > 18 * 60), 'offered an overbooked window');
  const empty = A.suggest({}, [K1], { secs: 6, hours: 3 }); assert.strictEqual(empty.best.from, '19:00'); assert.strictEqual(empty.best.to, '22:00'); });

console.log('allowance');
t('3 free ads, the 4th is paid, nothing past the maximum', () => {
  const r = { freeAds: 3, maxAds: 4, extraPrice: 1500 }; const cs = { a: { brand: 's' }, b: { brand: 's' }, c: { brand: 's' } };
  const a = A.allowance(r, cs, 's'); assert.strictEqual(a.freeLeft, 0); assert(a.nextIsPaid); assert(a.canAdd); assert.strictEqual(a.price, 1500);
  cs.d = { brand: 's', chargeable: true }; assert(!A.allowance(r, cs, 's').canAdd); });
t('rejected ads do not use up the allowance', () => { const a = A.allowance({ freeAds: 1, maxAds: 1 }, { a: { brand: 's', status: 'rejected' } }, 's'); assert.strictEqual(a.freeLeft, 1); });
t('airtime per day: 3 h at 6 s per 60 s rotation = 18 min', () => { assert.strictEqual(A.dailyAirtime({ slots: [{ from: '14:00', to: '17:00', secs: 6 }] }, K1), 1080); assert.strictEqual(A.plays({ slots: [{ from: '14:00', to: '17:00', secs: 6 }] }, K1), 180); });

console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
