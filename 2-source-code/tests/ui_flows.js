// Pre-release check of the features that span screens, in real browsers (tests/ui_audit.js checks each screen's layout):
//   1  the kiosk goes to its ads after the idle time, and a touch brings it back
//   2  the kiosk's QR code opens the phone app at that kiosk, with the store and the route ready
//   3  a wait time changed in the admin hub reaches a kiosk live (then the old value is put back)
//   4  a member's parking QR code (?park=) saves their spot (then it is cleared)
//   5  the intro film plays when the phone app opens and after an admin sign-in, a touch skips it, ?intro=0 turns it off
//   6  offline: the second visit opens with no connection (sw.js), with the last live data, and reconnects on its own
//   node tests/ui_flows.js [http://127.0.0.1:8766]
// Needs the server running (demo mode) and Chrome or Edge. Exit code: the number of failed checks.
const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');
const BASE = (process.argv[2] && /^https?:/.test(process.argv[2]) ? process.argv[2] : 'http://127.0.0.1:8766').replace(/\/$/, '');
const ROOT = path.join(__dirname, '..');
// the test browsers' scratch profiles (100-200 MB each, GPU caches) go next to the project, not onto the system drive
const TMP = path.join(ROOT, 'tools', 'browser-tmp'); fs.mkdirSync(TMP, { recursive: true });
const BROWSERS = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const KEY = (process.env.ADMIN_KEY || fs.readFileSync(path.join(ROOT, 'data', 'admin-password.txt'), 'utf8').split(/\r?\n/).find(l => l.trim() && !l.startsWith('#'))).trim();
async function api(p, method, body, headers) {
  const r = await fetch(BASE + p, { method: method || 'GET', headers: Object.assign(body ? { 'Content-Type': 'application/json' } : {}, headers || {}), body: body ? JSON.stringify(body) : undefined });
  return r.json().catch(() => ({}));
}
let pass = 0, fail = 0;
const check = (name, ok, info) => { if (ok) { pass++; console.log('  ok    ' + name); } else { fail++; console.log('  FAIL  ' + name + (info ? '  (' + info + ')' : '')); } };

/* one browser, one page */
async function browser(w, h, mobile, base) {
  base = base || BASE;
  const exe = BROWSERS.find(p => fs.existsSync(p)); if (!exe) throw new Error('no Chrome or Edge found');
  const port = 9100 + Math.floor(Math.random() * 300), prof = fs.mkdtempSync(path.join(TMP, 'ui-flows-'));
  const br = spawn(exe, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + prof, '--no-first-run', '--mute-audio', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', 'about:blank'], { stdio: 'ignore' });
  let ws; for (let i = 0; i < 80 && !ws; i++) { try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); const p = l.find(t => t.type === 'page'); if (p) ws = p.webSocketDebuggerUrl; } catch (e) { } if (!ws) await sleep(250); }
  const sock = new WebSocket(ws); await new Promise((ok, no) => { sock.onopen = ok; sock.onerror = no; });
  let id = 0; const wait = new Map();
  sock.onmessage = e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { const x = wait.get(m.id); wait.delete(m.id); m.error ? x.no(new Error(m.error.message)) : x.ok(m.result); } };
  const send = (method, params) => new Promise((ok, no) => { const i = ++id; const to = setTimeout(() => { wait.delete(i); no(new Error(method + ' got no answer in 30 s')); }, 30e3);
    wait.set(i, { ok: v => { clearTimeout(to); ok(v); }, no: e => { clearTimeout(to); no(e); } }); sock.send(JSON.stringify({ id: i, method, params: params || {} })); });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: !!mobile });
  const js = async code => { const r = await send('Runtime.evaluate', { expression: `(async()=>{${code}})()`, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).split('\n')[0]); return r.result.value; };
  const go = async url => { await send('Page.navigate', { url: base + url }); for (let i = 0; i < 80; i++) { await sleep(250); if (await js('return !!window.APP_READY').catch(() => false)) break; } await sleep(1500); };
  const until = async (code, ms) => { for (let t = 0; t < ms; t += 250) { if (await js(code).catch(() => false)) return true; await sleep(250); } return false; };
  const close = async () => { sock.close(); br.kill(); await sleep(500); try { fs.rmSync(prof, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 }); } catch (e) { } };
  const nav = url => send('Page.navigate', { url: base + url });          // no waiting: for what happens while the page opens
  const offline = on => send('Network.emulateNetworkConditions', { offline: !!on, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await send('Network.enable');
  return { js, go, nav, until, offline, close };
}

process.on('unhandledRejection', e => { console.log('  FAIL  ' + (e && e.message || e)); process.exitCode = 99; });
(async () => {
  // one browser at a time where 3D runs (a laptop's shared graphics chip stalls with several); the live-data check
  // uses the 2D map, which has nothing to do with it
  let member = null, open = [];
  const B = async (w, h, mobile, base) => { const b = await browser(w, h, mobile, base); open.push(b); return b; };
  const shut = async b => { open = open.filter(x => x !== b); await b.close(); };
  try {
    console.log('1  kiosk idle -> ads -> back');
    let kiosk = await B(1920, 1080);
    await kiosk.go('/?view=kiosk&lang=en&lock=1&idle=15');
    await kiosk.js(`resetAll();document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));`);
    check('no ads while someone is using it', await kiosk.js(`const a=document.getElementById('attract');return !a||a.hidden||getComputedStyle(a).display==='none';`));
    check('ads after 15 s without a touch', await kiosk.until(`const a=document.getElementById('attract');return !!a&&!a.hidden&&getComputedStyle(a).display!=='none';`, 21000));
    await kiosk.js(`const a=document.getElementById('attract');a.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));a.click();`);
    check('a touch brings the kiosk back', await kiosk.until(`const a=document.getElementById('attract');return !a||a.hidden||getComputedStyle(a).display==='none';`, 4000));

    console.log('2  kiosk QR code -> phone');
    await kiosk.go('/?view=kiosk&attract=0&lang=en&lock=1&idle=900');
    await kiosk.js(`selectBrand('bellagio');`); await sleep(1500);
    const link = await kiosk.js(`return phoneLink('bellagio');`);
    check('the route card shows a QR code', await kiosk.js(`return !!document.querySelector('#kBody .handoff .qrbox svg');`));
    await shut(kiosk);
    const u = new URL(link);
    check('the code links to the phone app at this kiosk, for this store', u.searchParams.get('view') === 'app' && u.searchParams.get('to') === 'bellagio' && /^[GFS],\d+,\d+$/.test(u.searchParams.get('at') || ''), link);
    let phone = await B(390, 844, true);
    await phone.go(u.pathname + u.search);
    check('the phone opens on Bellagio', await phone.until(`const d=document.getElementById('pDest');return !!d&&!d.hidden&&/Bellagio/.test(d.textContent);`, 8000));
    check('starting from the kiosk that was scanned', await phone.js(`const d=document.getElementById('pDest');return !!d&&/The kiosk I scanned/.test(d.textContent);`));
    check('with "Take me here" ready', await phone.js(`return !!document.querySelector('#pDest .getdir');`));
    await shut(phone);

    console.log('3  admin hub -> kiosk and phone, live');
    const snap = (await api('/api/poll?since=0')).snapshot || {};
    const before = (snap.stores || {}).avatar;
    kiosk = await B(1920, 1080); phone = await B(390, 844, true); const admin = await B(1440, 900);
    await kiosk.go('/?view=kiosk&attract=0&lang=en&lock=1&idle=900&map=2d');
    await phone.go('/?view=app&lang=en&map=2d');
    await admin.go('/?view=admin&map=2d');
    await admin.js(`const b=document.querySelector('#aHint button');if(b)b.click();`); await sleep(2000);
    await admin.js(`document.querySelector('[data-sec="waits"]').click();`); await sleep(1200);
    const cur = await kiosk.js(`return (waitView('avatar')||{}).t||'';`);
    const pick = /15/.test(cur) ? '30' : '15';
    await admin.js(`document.querySelector('[data-wait="avatar|${pick}"]').click();`);
    check('the kiosk shows the new wait within 5 s', await kiosk.until(`return /${pick}/.test((waitView('avatar')||{}).t||'');`, 5000), 'was ' + cur);
    check('so does the phone', await phone.until(`return /${pick}/.test((waitView('avatar')||{}).t||'');`, 5000));
    if (before) await api('/api/db/stores/avatar', 'PUT', before, { 'X-Admin-Key': KEY });     // put the old wait back
    check('the old wait is back', await kiosk.until(`return ((waitView('avatar')||{}).t||'')===${JSON.stringify(cur)};`, 5000));
    await shut(admin); await shut(kiosk);

    console.log('4  parking QR code -> member\'s spot');
    const num = '98' + String(Math.floor(Math.random() * 1e8)).padStart(8, '0');   // a new number each run: a number may ask for one code at a time
    const s = await api('/api/member/start', 'POST', { phone: num }); if (!s.code) throw new Error('no sign-in code: ' + JSON.stringify(s));
    const v = await api('/api/member/verify', 'POST', { phone: num, code: s.code }); if (!v.token) throw new Error('sign-in failed: ' + JSON.stringify(v));
    member = v.member.id;
    await phone.js(`localStorage.setItem('ireo.member',${JSON.stringify(v.token)});`);
    await phone.go('/?view=app&lang=en&map=2d&park=B1-P-23');
    check('the spot is saved for the member', await phone.until(`return !!(Member.me&&Member.me.car&&Member.me.car.level==='B1'&&Member.me.car.spot==='P-23');`, 8000));
    const me = await api('/api/member/me', 'GET', null, { Authorization: 'Bearer ' + v.token });
    check('and on the server', !!(me.member && me.member.car && me.member.car.spot === 'P-23'), JSON.stringify(me.member && me.member.car));
    check('the link is taken out of the address', await phone.js(`return !new URLSearchParams(location.search).get('park');`));
    await shut(phone);

    console.log('5  intro film');
    const intro = `const b=document.getElementById('intro'),on=!!b&&b.classList.contains('show')&&!b.classList.contains('out'),drawn=on&&b.classList.contains('run')&&b.querySelector('.iz-logo img').naturalWidth>0;`;
    phone = await B(390, 844, true);
    await phone.nav('/?view=app&lang=en&map=2d');
    check('the phone app opens with the intro', await phone.until(intro + `return drawn;`, 4000));
    check('which ends by itself, on the app', await phone.until(`return !document.getElementById('intro').classList.contains('show')&&!!window.APP_READY;`, 15000));
    await shut(phone);
    const adm = await B(1440, 900);
    await adm.nav('/?view=admin&map=2d'); await adm.until('return !!window.APP_READY&&!!document.querySelector("#aHint button");', 10000);
    check('none on the admin sign-in page', !(await adm.js(intro + 'return on;')));
    await adm.js(`document.querySelector('#aHint button').click();`);
    check('signing in plays it', await adm.until(intro + `return drawn;`, 4000));
    await adm.js(`document.getElementById('intro').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));`);
    check('a touch skips it, on the hub', await adm.until(`return !document.getElementById('intro').classList.contains('show')&&!!document.querySelector('.a-side [data-sec]');`, 2000));
    await adm.nav('/?view=app&lang=en&map=2d&intro=0'); await adm.until('return !!window.APP_READY;', 10000);
    check('?intro=0 turns it off', !(await adm.js(intro + 'return on;')));
    await shut(adm);

    console.log('6  offline');
    // a server of its own (spare port, empty data folder) that can be switched off for real: a browser's offline
    // switch does not reach the service worker
    const OPORT = 19100 + Math.floor(Math.random() * 400), OBASE = 'http://127.0.0.1:' + OPORT, ODIR = fs.mkdtempSync(path.join(TMP, 'offline-data-'));
    const startSrv = async () => { const p = spawn(process.execPath, [path.join(ROOT, 'server.js'), '--port', String(OPORT)], { env: Object.assign({}, process.env, { DATA_DIR: ODIR, ADMIN_KEY: 'offline-check', ADMIN_HINT: 'off', PORT: '', HOST: '127.0.0.1' }), stdio: 'ignore' });
      for (let i = 0; i < 40; i++) { try { if ((await fetch(OBASE + '/api/info')).ok) break; } catch (e) { } await sleep(250); } return p; };
    let osrv = await startSrv();
    try {
      phone = await B(390, 844, true, OBASE);
      await phone.go('/?view=app&lang=en&map=2d&intro=0');
      await fetch(OBASE + '/api/db/stores/avatar', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Admin-Key': 'offline-check' }, body: JSON.stringify({ wait: { mins: 25, status: 'open', updatedAt: new Date().toISOString() } }) });
      check('the app installs its offline copy', await phone.until(`return !!(await navigator.serviceWorker.getRegistration()||{}).active;`, 10000));
      await phone.until(`return (waitView('avatar')||{}).t==='25 min';`, 6000); await sleep(2500);   // the last live data is kept 1.5 s after a change
      osrv.kill(); await sleep(800);
      await phone.nav('/?view=app&lang=en&map=2d&intro=0');
      check('with the server switched off the app still opens', await phone.until('return !!window.APP_READY;', 15000));
      check('with the last live data (not the sample data)', await phone.until(`return DBKIND==='server'&&(waitView('avatar')||{}).t==='25 min';`, 6000));
      check('saying it is reconnecting', await phone.js(`return dbLabel()==='offline';`));
      osrv = await startSrv();
      check('and it reconnects by itself', await phone.until(`return dbLabel()==='live';`, 25000));
      await shut(phone);
    } finally { osrv.kill(); await sleep(300); try { fs.rmSync(ODIR, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch (e) { } }
  } catch (e) { fail++; console.log('  FAIL  ' + e.message); }
  finally {
    for (const b of open) await b.close();
    if (member) await api('/api/members/' + member, 'DELETE', null, { 'X-Admin-Key': KEY });
  }
  console.log(pass + ' passed, ' + fail + ' failed');
  process.exitCode = fail;
})();