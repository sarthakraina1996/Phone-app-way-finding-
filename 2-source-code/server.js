/* ============================================================
   IREO BOULEVARD – demo server (Node 18+, no packages needed)

     node server.js            ->  http://localhost:8766   (this computer only)
     node server.js --lan      ->  also reachable from phones and kiosks on the same Wi-Fi
     node server.js --port 9000
   On a host (Render etc.) it reads PORT, and optionally HOST, DATA_DIR and ADMIN_KEY, from the environment.

   It does two jobs:
   1. Serves the web app (web/).
   2. Holds the live data (offers, wait times, logos, events, kiosks, ads…) and pushes every change to every
      open screen straight away, so the admin hub, kiosks and phones always show the same thing. Data is kept
      in DATA_DIR/live-db.json (default data/), so it survives a restart.

   The admin password: changes to the mall's data need it (the X-Admin-Key header). It comes from ADMIN_KEY,
   or is made on first run and kept in DATA_DIR/admin-password.txt. Kiosks and phones need no password: the
   only things they write are their own counters (stats, adstats), which are size-checked.

   API (used by web/js/datastore.js):
     GET    /api/info              {ok, seeded, collections, auth, seq}
     GET    /api/stream            Server-Sent Events: "snapshot" {seq, data} then "change" {seq, c, id, data}
     GET    /api/poll?since=<seq>  the same for connections that cannot stream (some proxies and tunnels):
                                   waits up to 25 s, then {seq, changes:[...]} or {seq, snapshot}
     POST   /api/login             {key} -> 200 if it is the admin password
     PUT    /api/db/<c>/<id>       save one document (JSON body)
     DELETE /api/db/<c>/<id>       delete one document
     POST   /api/seed              first run only: the sample data the app ships with

   Members (the phone app's sign-in). Private: members are never part of the live stream, and are kept apart from
   the mall's data in DATA_DIR/members.json. A member signs in with a mobile number and a one-time code.
     POST   /api/member/start      {phone} -> a code is sent by SMS. Until an SMS service is connected (see sendSms)
                                   the server runs in DEMO MODE and returns the code instead: fine for a demo,
                                   NOT for real members (anyone could sign in as any number).
     POST   /api/member/verify     {phone, code} -> {token, member, isNew}
     GET    /api/member/me         (Authorization: Bearer <token>) the member's own record
     PUT    /api/member/me         {name, favs, prefs, car}   car: where the member parked ({level, spot, note}), or null
     POST   /api/member/logout
     GET    /api/members           admin: everyone          POST /api/members/points {id, points, note}   admin: add or take points
     DELETE /api/members/<id>      admin: remove a member
   ============================================================ */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const zlib = require('zlib');

const args = process.argv.slice(2);
const LAN = args.includes('--lan');
const HOSTED = !!process.env.PORT;                       // a hosting service tells us its port
const PORT = +(args[args.indexOf('--port') + 1] || process.env.PORT || 8766) || 8766;    // 8766: the Ireo app keeps 8765, so both can run
const HOST = process.env.HOST || (LAN || HOSTED ? '0.0.0.0' : '127.0.0.1');
const ROOT = path.join(__dirname, 'web');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'live-db.json');
const KEY_FILE = path.join(DATA_DIR, 'admin-password.txt');
const COLLECTIONS = ['stores', 'ads', 'events', 'settings', 'roles', 'users', 'stats', 'kiosks', 'adrules', 'adcreatives', 'adstats'];
const PUBLIC_WRITE = new Set(['stats', 'adstats']);      // counters written by kiosks and phones
const MAX_BODY = 12 * 1024 * 1024;                       // logos and ad images arrive as data URLs
const MAX_PUBLIC_BODY = 4096;
const ID_OK = /^[A-Za-z0-9_\-:.]{1,80}$/;

/* ---------------- the admin password ---------------- */
function adminKey() {
  if (process.env.ADMIN_KEY) return process.env.ADMIN_KEY.trim();
  try { const k = fs.readFileSync(KEY_FILE, 'utf8').split(/\r?\n/).find(l => l.trim() && !l.startsWith('#')); if (k) return k.trim(); } catch (e) { /* first run */ }
  const k = crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 12);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(KEY_FILE, '# Admin hub password for Ireo Boulevard (keep private). Delete this file to make a new one.\n' + k + '\n');
  return k;
}
const KEY = adminKey();
const keyHash = crypto.createHash('sha256').update(KEY).digest();
function keyOk(k) { return typeof k === 'string' && k.length > 0 && crypto.timingSafeEqual(crypto.createHash('sha256').update(k).digest(), keyHash); }

/* ---------------- the data ---------------- */
let db = { seeded: false, data: {} };
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) { /* first run */ }
db.data = db.data || {};
COLLECTIONS.forEach(c => { db.data[c] = db.data[c] || {}; });
let saveT = null;
function persist() {                                    // debounced, written atomically
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DB_FILE + '.tmp', JSON.stringify(db));
      fs.renameSync(DB_FILE + '.tmp', DB_FILE);
    } catch (e) { console.error('Could not save the live data:', e.message); }
  }, 250);
}

/* ---------------- live updates: a numbered change log, streamed or long-polled ---------------- */
let seq = Date.now();                                    // starts from the clock: a restarted server is always "newer"
const LOG = [];                                          // the last changes, for screens catching up by polling
const clients = new Set(), waiters = new Set();
function send(res, event, payload) { res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`); }
function record(c, id, data) {
  seq++;
  const ch = { seq, c, id, data };
  LOG.push(ch); if (LOG.length > 800) LOG.shift();
  clients.forEach(res => { try { send(res, 'change', ch); } catch (e) { clients.delete(res); } });
  waiters.forEach(w => w());
}
function resnapshot() {                                  // after a seed: everyone starts again from the full data
  seq++; LOG.length = 0;
  clients.forEach(res => { try { send(res, 'snapshot', { seq, data: db.data }); } catch (e) { clients.delete(res); } });
  waiters.forEach(w => w());
}
setInterval(() => clients.forEach(res => { try { res.write(': keep-alive\n\n'); } catch (e) { clients.delete(res); } }), 20000);
function changesSince(since) {
  if (!(since > 0) || since > seq || (!LOG.length && since !== seq) || (LOG.length && since < LOG[0].seq - 1)) return { seq, snapshot: db.data };
  return { seq, changes: LOG.filter(ch => ch.seq > since) };
}

/* ---------------- members ---------------- */
const MEM_FILE = path.join(DATA_DIR, 'members.json');
let mem = { members: {}, sessions: {} };                 // sessions: sha256(token) -> {id, exp}
try { mem = JSON.parse(fs.readFileSync(MEM_FILE, 'utf8')); } catch (e) { /* none yet */ }
mem.members = mem.members || {}; mem.sessions = mem.sessions || {};
let memT = null;
function persistMembers() {
  clearTimeout(memT);
  memT = setTimeout(() => {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(MEM_FILE + '.tmp', JSON.stringify(mem)); fs.renameSync(MEM_FILE + '.tmp', MEM_FILE); }
    catch (e) { console.error('Could not save the members:', e.message); }
  }, 250);
}
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const SESSION_MS = 90 * 24 * 3600 * 1000, CODE_MS = 5 * 60 * 1000;
const codes = new Map();                                 // phone -> {hash, exp, tries, at, sent[]}
/* an Indian mobile number, however it was typed: "+91 98765 43210", "09876543210" -> "+919876543210" */
function phoneOf(v) { const d = String(v == null ? '' : v).replace(/\D/g, '').replace(/^(?:91|0)(?=\d{10}$)/, ''); return /^[6-9]\d{9}$/.test(d) ? '+91' + d : null; }
/* Sends the sign-in code by SMS. No SMS service is connected yet: SMS_LIVE is false and the server answers in demo
   mode (the code goes back to the app, which shows it). To go live: call the provider's API in sendSms (MSG91,
   Twilio, ...), return true once it has accepted the message, and set SMS_LIVE to true. */
const SMS_LIVE = false;
async function sendSms(phone, text) { return false; }
function memberByPhone(phone) { for (const id in mem.members) if (mem.members[id].phone === phone) return mem.members[id]; return null; }
function newMemberId() { for (;;) { const id = String(crypto.randomInt(1000000000, 9999999999)); if (!mem.members[id]) return id; } }
function memberOfRequest(req) {
  const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || ''); if (!m) return null;
  const s = mem.sessions[sha(m[1])]; if (!s) return null;
  if (s.exp < Date.now()) { delete mem.sessions[sha(m[1])]; persistMembers(); return null; }
  return mem.members[s.id] || null;
}
/* what a member sees of their own record */
const memberView = m => ({ id: m.id, name: m.name || '', phone: m.phone.replace(/^(\+91)(\d{2})\d{5}(\d{3})$/, '$1 $2•••••$3'), joined: m.joined, points: m.points || 0,
  favs: m.favs || [], prefs: m.prefs || {}, car: m.car || null, log: (m.log || []).slice(-10).reverse() });
const cleanText = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, max);
setInterval(() => {                                       // old codes and sessions
  const now = Date.now(); codes.forEach((c, k) => { if (c.exp < now - 3600000) codes.delete(k); });
  let cut = false; for (const h in mem.sessions) if (mem.sessions[h].exp < now) { delete mem.sessions[h]; cut = true; } if (cut) persistMembers();
}, 600000);

async function memberApi(req, res, p, ip) {
  if (p === '/api/member/start' && req.method === 'POST') {
    if (!allow(ip, 'mstart', 6)) return json(res, 429, { ok: false, error: 'Too many tries. Wait a minute.' });
    const body = await readBody(req, 1024), phone = phoneOf(body && body.phone);
    if (!phone) return json(res, 400, { ok: false, error: 'Enter a 10-digit mobile number.' });
    const now = Date.now(), old = codes.get(phone), sent = ((old && old.sent) || []).filter(t => now - t < 3600000);
    if (sent.length >= 5) return json(res, 429, { ok: false, error: 'Too many codes for this number. Try again in an hour.' });
    if (old && now - old.at < 20000) return json(res, 429, { ok: false, error: 'A code was just sent. Wait a few seconds.' });
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    codes.set(phone, { hash: sha(phone + ':' + code), exp: now + CODE_MS, tries: 0, at: now, sent: sent.concat([now]) });
    const delivered = SMS_LIVE && await sendSms(phone, `${code} is your Ireo Boulevard sign-in code. It is valid for 5 minutes.`).catch(() => false);
    if (SMS_LIVE && !delivered) { codes.delete(phone); return json(res, 502, { ok: false, error: 'The code could not be sent. Try again in a moment.' }); }
    return json(res, 200, delivered ? { ok: true } : { ok: true, demo: true, code });
  }
  if (p === '/api/member/verify' && req.method === 'POST') {
    if (!allow(ip, 'mverify', 12)) return json(res, 429, { ok: false, error: 'Too many tries. Wait a minute.' });
    const body = await readBody(req, 1024), phone = phoneOf(body && body.phone), c = phone && codes.get(phone);
    const given = String((body && body.code) || '').replace(/\D/g, '');
    if (!c || c.exp < Date.now()) return json(res, 400, { ok: false, error: 'That code has expired. Ask for a new one.' });
    if (++c.tries > 5) { codes.delete(phone); return json(res, 429, { ok: false, error: 'Too many wrong codes. Ask for a new one.' }); }
    const a = Buffer.from(sha(phone + ':' + given), 'hex'), b = Buffer.from(c.hash, 'hex');
    if (given.length !== 6 || !crypto.timingSafeEqual(a, b)) return json(res, 401, { ok: false, error: 'That code is not right.' });
    codes.delete(phone);
    let m = memberByPhone(phone); const isNew = !m;
    if (!m) { const id = newMemberId(); m = mem.members[id] = { id, phone, name: '', joined: new Date().toISOString(), points: 0, favs: [], prefs: {}, log: [] }; }
    m.seen = new Date().toISOString();
    const token = crypto.randomBytes(32).toString('hex'); mem.sessions[sha(token)] = { id: m.id, exp: Date.now() + SESSION_MS }; persistMembers();
    return json(res, 200, { ok: true, token, isNew, member: memberView(m) });
  }
  if (p === '/api/member/me' || p === '/api/member/logout') {
    const m = memberOfRequest(req); if (!m) return json(res, 401, { ok: false, error: 'Please sign in again.' });
    if (p === '/api/member/logout' && req.method === 'POST') { delete mem.sessions[sha(/^Bearer (.+)$/.exec(req.headers.authorization)[1])]; persistMembers(); return json(res, 200, { ok: true }); }
    if (req.method === 'GET') return json(res, 200, { ok: true, member: memberView(m) });
    if (req.method === 'PUT') {
      if (!allow(ip, 'mwrite', 60)) return json(res, 429, { ok: false, error: 'slow down' });
      const body = await readBody(req, 8192); if (!plainObject(body)) return json(res, 400, { ok: false, error: 'expected an object' });
      if ('name' in body) m.name = cleanText(body.name, 40);
      if (Array.isArray(body.favs)) m.favs = [...new Set(body.favs.filter(f => typeof f === 'string' && ID_OK.test(f)))].slice(0, 100);
      if (plainObject(body.prefs)) m.prefs = { lang: body.prefs.lang === 'hi' ? 'hi' : 'en', stepFree: !!body.prefs.stepFree };
      if (body.car === null) delete m.car;
      else if (plainObject(body.car)) {                    // where the member parked: a basement level and a pillar or bay
        const level = String(body.car.level || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4), spot = cleanText(body.car.spot, 16);
        if (!level || !spot) return json(res, 400, { ok: false, error: 'Choose the level and enter the pillar or bay number.' });
        m.car = { level, spot, note: cleanText(body.car.note, 60), at: new Date().toISOString() };
      }
      persistMembers(); return json(res, 200, { ok: true, member: memberView(m) });
    }
  }
  if (p.startsWith('/api/members')) {
    if (!keyOk(req.headers['x-admin-key'])) return json(res, 401, { ok: false, error: 'admin password needed' });
    if (p === '/api/members' && req.method === 'GET')
      return json(res, 200, { ok: true, demo: !SMS_LIVE, members: Object.values(mem.members).map(m => ({ id: m.id, name: m.name || '', phone: m.phone, joined: m.joined, seen: m.seen || '', points: m.points || 0, favs: (m.favs || []).length, log: (m.log || []).slice(-5).reverse() })) });
    if (p === '/api/members/points' && req.method === 'POST') {
      const body = await readBody(req, 2048), m = body && mem.members[String(body.id)], pts = Math.round(+(body && body.points));
      if (!m) return json(res, 404, { ok: false, error: 'No such member.' });
      if (!(Math.abs(pts) >= 1 && Math.abs(pts) <= 100000)) return json(res, 400, { ok: false, error: 'Points must be a whole number, not zero.' });
      if ((m.points || 0) + pts < 0) return json(res, 400, { ok: false, error: 'This member does not have that many points.' });
      m.points = (m.points || 0) + pts; m.log = (m.log || []).concat([{ at: new Date().toISOString(), points: pts, note: cleanText(body.note, 80), by: cleanText(body.by, 40) }]).slice(-50);
      persistMembers(); return json(res, 200, { ok: true, points: m.points });
    }
    const d = /^\/api\/members\/(\d{10})$/.exec(p);
    if (d && req.method === 'DELETE') {
      if (!mem.members[d[1]]) return json(res, 404, { ok: false, error: 'No such member.' });
      delete mem.members[d[1]]; for (const h in mem.sessions) if (mem.sessions[h].id === d[1]) delete mem.sessions[h];
      persistMembers(); return json(res, 200, { ok: true });
    }
  }
  return json(res, 404, { ok: false, error: 'not found' });
}

/* ---------------- rate limits (per visitor) ---------------- */
const buckets = new Map();
function allow(ip, kind, perMin) {
  const k = kind + '|' + ip, now = Date.now();
  let b = buckets.get(k); if (!b || now - b.t > 60000) { b = { t: now, n: 0 }; buckets.set(k, b); }
  return ++b.n <= perMin;
}
setInterval(() => { const now = Date.now(); buckets.forEach((b, k) => { if (now - b.t > 60000) buckets.delete(k); }); }, 60000);
/* The admin password under the admin hub's sign-in, for the demo laptop: only to a page opened on this computer itself
   (a loopback connection, a localhost address, no proxy or tunnel headers), never through the Cloudflare tunnel or on a
   host. Off when ADMIN_KEY is set (a hosted server) or with ADMIN_HINT=off; ADMIN_HINT=on forces it (the tests). */
const SHOW_HINT = process.env.ADMIN_HINT === 'on' || (process.env.ADMIN_HINT !== 'off' && !process.env.ADMIN_KEY);
function onThisComputer(req) {
  const a = String(req.socket.remoteAddress || '');
  const host = String(req.headers.host || '').toLowerCase().replace(/:\d+$/, '');
  const proxied = ['x-forwarded-for', 'x-forwarded-host', 'x-real-ip', 'forwarded', 'cf-connecting-ip', 'cf-ray', 'via'].some(h => req.headers[h]);
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(a) && ['localhost', '127.0.0.1', '[::1]'].includes(host) && !proxied;
}

const ipOf = req => String(req.headers['cf-connecting-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket.remoteAddress || '').trim();

/* ---------------- static files ---------------- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp4': 'video/mp4', '.glb': 'model/gltf-binary',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const SECURITY = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin' };
function serveStatic(req, res, urlPath) {
  let rel;
  try { rel = decodeURIComponent(urlPath.split('?')[0]); } catch (e) { res.writeHead(400); return res.end(); }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT + path.sep) && file !== ROOT) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, Object.assign({ 'Content-Type': 'text/plain' }, SECURITY)); return res.end('Not found'); }
    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const headers = Object.assign({ 'Content-Type': type, 'Cache-Control': /\.(mp4|png|jpe?g|webp)$/i.test(file) ? 'public, max-age=3600' : 'no-cache',
      'Last-Modified': st.mtime.toUTCString() }, SECURITY);
    if (req.headers['if-modified-since'] && new Date(req.headers['if-modified-since']) >= new Date(st.mtime.toUTCString())) { res.writeHead(304, headers); return res.end(); }
    const range = req.headers.range;                     // video seeking
    if (range && type === 'video/mp4') {
      const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
      const start = m[1] ? +m[1] : 0, end = m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1;
      if (start > end || start >= st.size) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end(); }
      res.writeHead(206, Object.assign(headers, { 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 }));
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    if (/^(text\/|application\/(json|manifest)|image\/svg)/.test(type) && /gzip/.test(req.headers['accept-encoding'] || '')) {
      return gzipped(file, st, (err, buf) => {                 // text compresses 3-10x: much faster over a home upload or a tunnel
        if (err) { res.writeHead(500); return res.end(); }
        res.writeHead(200, Object.assign(headers, { 'Content-Encoding': 'gzip', 'Content-Length': buf.length, Vary: 'Accept-Encoding' }));
        res.end(req.method === 'HEAD' ? undefined : buf);
      });
    }
    res.writeHead(200, Object.assign(headers, { 'Content-Length': st.size, 'Accept-Ranges': 'bytes' }));
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

const GZ = new Map();                                      // file -> {mtime, buf}: each file is compressed once
function gzipped(file, st, cb) {
  const hit = GZ.get(file);
  if (hit && hit.mtime === st.mtimeMs) return cb(null, hit.buf);
  fs.readFile(file, (err, raw) => {
    if (err) return cb(err);
    zlib.gzip(raw, { level: 9 }, (e, buf) => { if (e) return cb(e); GZ.set(file, { mtime: st.mtimeMs, buf }); cb(null, buf); });
  });
}

/* ---------------- API ---------------- */
function readBody(req, limit) {
  return new Promise((ok, fail) => {
    let size = 0; const parts = [];
    let over = false;
    req.on('data', ch => { if (over) return; size += ch.length; if (size > limit) { over = true; parts.length = 0; fail(Object.assign(new Error('too large'), { status: 413 })); } else parts.push(ch); });   // answer 413, let the rest drain
    req.on('end', () => { if (over) return; try { ok(parts.length ? JSON.parse(Buffer.concat(parts).toString('utf8')) : null); } catch (e) { fail(Object.assign(new Error('bad JSON'), { status: 400 })); } });
    req.on('error', fail);
  });
}
function json(res, status, obj) { res.writeHead(status, Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, SECURITY)); res.end(JSON.stringify(obj)); }
const plainObject = v => v && typeof v === 'object' && !Array.isArray(v);

async function api(req, res, url) {
  const p = url.pathname, ip = ipOf(req);
  if (p === '/api/info') return json(res, 200, { ok: true, seeded: !!db.seeded, collections: COLLECTIONS, auth: true, members: true, seq });
  if (p === '/api/admin/hint') return json(res, 200, SHOW_HINT && onThisComputer(req) ? { ok: true, key: KEY } : { ok: true });
  if (p.startsWith('/api/member')) return memberApi(req, res, p, ip);
  if (p === '/api/stream') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write('retry: 2000\n\n');
    send(res, 'snapshot', { seq, data: db.data });
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  if (p === '/api/poll') {
    const since = +url.searchParams.get('since') || 0;
    let out = changesSince(since);
    if (out.snapshot || out.changes.length) return json(res, 200, out);
    let done = false;
    const finish = () => { if (done) return; done = true; waiters.delete(finish); clearTimeout(t); json(res, 200, changesSince(since)); };
    const t = setTimeout(finish, 25000);
    waiters.add(finish);
    req.on('close', () => { done = true; waiters.delete(finish); clearTimeout(t); });
    return;
  }
  if (p === '/api/login' && req.method === 'POST') {
    if (!allow(ip, 'login', 10)) return json(res, 429, { ok: false, error: 'Too many tries. Wait a minute.' });
    const body = await readBody(req, 1024);
    return keyOk(body && body.key) ? json(res, 200, { ok: true }) : json(res, 401, { ok: false, error: 'wrong password' });
  }
  if (p === '/api/seed' && req.method === 'POST') {
    const body = await readBody(req, MAX_BODY);
    if (!db.seeded && plainObject(body)) {
      COLLECTIONS.forEach(c => { if (plainObject(body[c])) db.data[c] = Object.assign({}, body[c], db.data[c]); });
      db.seeded = true; persist(); resnapshot();
    }
    return json(res, 200, { ok: true, seeded: true });
  }
  const m = /^\/api\/db\/([a-z]+)\/([^/]+)$/.exec(p);
  if (m && (req.method === 'PUT' || req.method === 'DELETE')) {
    let id; try { id = decodeURIComponent(m[2]); } catch (e) { id = ''; }
    const c = m[1];
    if (!COLLECTIONS.includes(c) || !ID_OK.test(id)) return json(res, 400, { ok: false, error: 'unknown collection or id' });
    const pub = PUBLIC_WRITE.has(c);
    if (!pub && !keyOk(req.headers['x-admin-key'])) return json(res, 401, { ok: false, error: 'admin password needed' });
    if (!allow(ip, pub ? 'count' : 'write', pub ? 90 : 240)) return json(res, 429, { ok: false, error: 'slow down' });
    if (req.method === 'PUT') {
      const data = await readBody(req, pub ? MAX_PUBLIC_BODY : MAX_BODY);
      if (!plainObject(data)) return json(res, 400, { ok: false, error: 'expected an object' });
      db.data[c][id] = data; persist(); record(c, id, data);
      return json(res, 200, { ok: true, seq });
    }
    if (pub && !keyOk(req.headers['x-admin-key'])) return json(res, 401, { ok: false, error: 'admin password needed' });   // counters: only the admin clears them
    delete db.data[c][id]; persist(); record(c, id, null);
    return json(res, 200, { ok: true, seq });
  }
  return json(res, 404, { ok: false, error: 'not found' });
}

const server = http.createServer((req, res) => {
  let url;
  try { url = new URL(req.url, 'http://x'); } catch (e) { res.writeHead(400); return res.end(); }
  if (url.pathname === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
  if (url.pathname.startsWith('/api/')) {
    api(req, res, url).catch(e => { if (!res.headersSent) json(res, e.status || 500, { ok: false, error: e.message }); });
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  serveStatic(req, res, url.pathname);
});
server.requestTimeout = 0;                               // streams and long polls stay open
/* Windows lets a second process listen on the same port; two servers would each keep their own copy of the data */
function alreadyRunning(cb) {
  if (HOSTED) return cb(false);
  const rq = http.get({ host: '127.0.0.1', port: PORT, path: '/healthz', timeout: 800 }, r => { r.resume(); cb(r.statusCode === 200); });
  rq.on('timeout', () => { rq.destroy(); cb(false); });
  rq.on('error', () => cb(false));
}
alreadyRunning(up => {
  if (up) { console.log(`Ireo Boulevard is already running: http://localhost:${PORT}/`); process.exit(0); }
  server.listen(PORT, HOST, onListening);
});
function onListening() {
  const base = HOSTED ? `port ${PORT}` : `http://localhost:${PORT}/`;
  console.log(`Ireo Boulevard is running: ${base}`);
  if (!HOSTED) {
    console.log(`  Kiosk      http://localhost:${PORT}/?view=kiosk`);
    console.log(`  Phone app  http://localhost:${PORT}/?view=app`);
    console.log(`  Admin hub  http://localhost:${PORT}/?view=admin`);
  }
  if (LAN) {
    const ips = Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
    ips.forEach(ip => console.log(`  On this Wi-Fi: http://${ip}:${PORT}/`));
  } else if (!HOSTED) console.log('  (this computer only - start with --lan to open it to phones on the same Wi-Fi)');
  console.log(`Live data: ${DB_FILE}`);
  if (!SMS_LIVE) console.log('Member sign-in: DEMO MODE (no SMS service connected: codes are shown on screen, see sendSms in server.js)');
  console.log(process.env.ADMIN_KEY ? 'Admin password: from ADMIN_KEY' : `Admin password: in ${KEY_FILE}`);
}
