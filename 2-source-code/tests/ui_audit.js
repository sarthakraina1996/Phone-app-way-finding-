// Pre-release check of every screen, in a real browser: the phone app (three phone sizes, a tablet and the desktop
// mock-up), the kiosk (landscape, smaller landscape and portrait screens) and the admin hub, walked through their main
// features as a tester would, in English and Hindi, signed out and as a member.
//   node tests/ui_audit.js [http://127.0.0.1:8766] [OUT_DIR]
// At every step it checks the layout and writes a screenshot: text squeezed to a word or so a line, content spilling
// out of its box or off the screen, broken images, and any script error. OUT_DIR/report.json lists what it found;
// the exit code is the number of steps with a problem. Needs the server running and Chrome or Edge (Node 22+, no
// packages). It signs in a demo member (sample data, removed at the end) and the admin hub (on this computer the
// sign-in shows the password); it opens forms but never saves them.
const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');
const BASE = (process.argv[2] && /^https?:/.test(process.argv[2]) ? process.argv[2] : 'http://127.0.0.1:8766').replace(/\/$/, '');
const OUT = process.argv[3] || path.join(os.tmpdir(), 'ui_audit');
const ROOT = path.join(__dirname, '..');
// the test browsers' scratch profiles (100-200 MB each, GPU caches) go next to the project, not onto the system drive
const TMP = path.join(ROOT, 'tools', 'browser-tmp'); fs.mkdirSync(TMP, { recursive: true });
const BROWSERS = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DEMO_PHONE = '9811122338';
const adminKey = () => (process.env.ADMIN_KEY || fs.readFileSync(path.join(ROOT, 'data', 'admin-password.txt'), 'utf8').split(/\r?\n/).find(l => l.trim() && !l.startsWith('#'))).trim();
async function api(p, method, body, headers) {
  const r = await fetch(BASE + p, { method: method || 'GET', headers: Object.assign(body ? { 'Content-Type': 'application/json' } : {}, headers || {}), body: body ? JSON.stringify(body) : undefined });
  return r.json();
}

/* the layout checks, run in the page */
const AUDIT = `(()=>{
const out=[],W=innerWidth,H=innerHeight;
const label=e=>{const one=x=>x.id?'#'+x.id:x.tagName.toLowerCase()+(typeof x.className==='string'&&x.className.trim()?'.'+x.className.trim().split(/\\s+/).slice(0,2).join('.'):'');
  const p=e.parentElement;return (p&&p!==document.body?one(p)+' > ':'')+one(e);};
const shown=e=>{for(let p=e;p&&p.nodeType===1;p=p.parentElement){const cs=getComputedStyle(p);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity<0.05)return false;
    if(p!==e&&/(hidden|clip)/.test(cs.overflowX)&&p.getBoundingClientRect().width<2)return false;}      // inside a panel folded to nothing
  const r=e.getBoundingClientRect();return r.width>0&&r.height>0;};
const els=[...document.body.querySelectorAll('*')].filter(e=>!/^(SCRIPT|STYLE|CANVAS|VIDEO|svg|path|circle|rect|line|polyline|polygon|g|defs|use)$/i.test(e.tagName)&&!e.closest('svg')&&!e.closest('#labels')&&!e.closest('.plan2d')&&shown(e));
/* the box that clips an element: its nearest ancestor that hides overflow without scrolling sideways (else the window) */
const clipOf=e=>{for(let p=e.parentElement;p&&p!==document.documentElement;p=p.parentElement){const cs=getComputedStyle(p);
  if(/(auto|scroll)/.test(cs.overflowX))return null;                     // inside a sideways scroller: fine
  if(/(hidden|clip)/.test(cs.overflowX))return p.getBoundingClientRect();}return {left:0,right:W};};
for(const e of els){
  const cs=getComputedStyle(e),r=e.getBoundingClientRect();
  const tn=[...e.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim());
  if(tn.length){const words=tn.map(n=>n.textContent.trim()).join(' ').split(/\\s+/).filter(Boolean).length;
    if(words>=3){const tops=new Set();for(const n of tn){const rg=document.createRange();rg.selectNodeContents(n);for(const q of rg.getClientRects())if(q.width>1)tops.add(Math.round(q.top/3));}
      if(tops.size>=3&&words/tops.size<1.7)out.push({kind:'squeezed',el:label(e),text:e.textContent.trim().replace(/\\s+/g,' ').slice(0,70),lines:tops.size,words,width:Math.round(r.width)});}}
  /* content escaping a box that does not clip it: only what carries text or a picture, not a sideways scroller
     (carousels run edge to edge on purpose) nor an empty decoration */
  if(e.clientWidth>0&&e.scrollWidth>e.clientWidth+4&&cs.overflowX==='visible'&&!/^(INPUT|SELECT|TEXTAREA)$/.test(e.tagName)){
    const esc=[...e.querySelectorAll('*')].find(d=>{const q=d.getBoundingClientRect();if(!(q.width>0&&q.height>0)||(q.right<=r.right+2&&q.left>=r.left-2))return false;
      for(let p=d;p&&p!==e;p=p.parentElement)if(/(auto|scroll)/.test(getComputedStyle(p).overflowX))return false;
      if(getComputedStyle(d).position==='absolute'&&!d.textContent.trim())return false;
      return !!([...d.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())||d.tagName==='IMG');});
    if(esc)out.push({kind:'spills',el:label(e),text:esc.textContent.trim().replace(/\\s+/g,' ').slice(0,50),by:e.scrollWidth-e.clientWidth});}
  const c=clipOf(e);
  if(c&&cs.position!=='fixed'&&(r.right>c.right+2||r.left<c.left-2)&&r.width<(c.right-c.left)*1.5&&(e.textContent.trim()||e.tagName==='IMG'||e.tagName==='BUTTON'))
    out.push({kind:'cut off',el:label(e),text:e.textContent.trim().replace(/\\s+/g,' ').slice(0,50),by:Math.round(Math.max(r.right-c.right,c.left-r.left))});
}
for(const i of document.querySelectorAll('img'))if(shown(i)&&i.complete&&!i.naturalWidth)out.push({kind:'broken image',el:label(i),src:(i.currentSrc||i.src).slice(0,90)});
/* a problem inside another reported one is the same problem */
const seen=new Set(),keep=[];for(const o of out){const k=o.kind+'|'+o.el+'|'+(o.text||'').slice(0,30);if(!seen.has(k)){seen.add(k);keep.push(o);}}
return {issues:keep.slice(0,40),errors:(typeof recentErrors==='function'?recentErrors():[]).length};})()`;

/* a tiny DevTools-protocol client */
async function cdp(port) {
  let ws; for (let i = 0; i < 80 && !ws; i++) { try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); const p = l.find(t => t.type === 'page'); if (p) ws = p.webSocketDebuggerUrl; } catch (e) { } if (!ws) await sleep(250); }
  if (!ws) throw new Error('the browser did not start');
  const sock = new WebSocket(ws); await new Promise((ok, no) => { sock.onopen = ok; sock.onerror = no; });
  let id = 0; const wait = new Map(), subs = [];
  sock.onmessage = e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { const w = wait.get(m.id); wait.delete(m.id); m.error ? w.no(new Error(m.error.message)) : w.ok(m.result); } else if (m.method) subs.forEach(f => f(m)); };
  const send = (method, params) => new Promise((ok, no) => { const i = ++id; const to = setTimeout(() => { wait.delete(i); no(new Error(method + ' timed out')); }, 60e3);
    wait.set(i, { ok: v => { clearTimeout(to); ok(v); }, no: e => { clearTimeout(to); no(e); } }); sock.send(JSON.stringify({ id: i, method, params: params || {} })); });
  return { send, on: f => subs.push(f), close: () => sock.close() };
}

/* the walks: [name, javascript to run first, ms to wait] */
const S = (name, js, ms) => [name, js || '', ms == null ? 900 : ms];
const tap = sel => `{const e=document.querySelector(${JSON.stringify(sel)});if(!e)throw new Error('nothing to tap: ${sel.replace(/'/g, '')}');e.click();}`;
const closeModals = `document.querySelectorAll('.modal').forEach(m=>m.remove());`;
const PHONE = [
  S('home', `document.getElementById('pScroll').scrollTop=0;`, 600),
  S('home, scrolled', `document.getElementById('pScroll').scrollTop=1400;`),
  S('home, bottom', `const s=document.getElementById('pScroll');s.scrollTop=s.scrollHeight;`),
  S('search "bel"', `document.getElementById('pScroll').scrollTop=0;const q=document.getElementById('pq');q.focus();q.value='bel';q.dispatchEvent(new Event('input',{bubbles:true}));`, 1200),
  S('search, no match', `const q=document.getElementById('pq');q.value='zzqx';q.dispatchEvent(new Event('input',{bubbles:true}));`),
  S('chip: dining', `const q=document.getElementById('pq');q.value='';q.dispatchEvent(new Event('input',{bubbles:true}));` + tap('#pChips [data-c="dining"]'), 1200),
  S('chip: fashion', tap('#pChips [data-c="fashion"]'), 1200),
  S('store: Bellagio', `selectBrand('bellagio');`, 1800),
  S('store: Bellagio, scrolled', `const s=document.getElementById('pScroll');s.scrollTop=s.scrollHeight;`),
  S('route: started', tap('#pDest .getdir'), 2500),
  S('route: next step', tap('#rhNext'), 1500),
  S('route: next step again', tap('#rhNext'), 1500),
  S('route: ended', tap('#rhEnd'), 1500),
  S('tab: map', `resetAll();` + tap('#pTabs [data-t="map"]'), 1800),
  S('tab: offers', tap('#pTabs [data-t="offers"]'), 1200),
  S('tab: offers, scrolled', `const s=document.getElementById('pScroll');s.scrollTop=s.scrollHeight/2;`),
  S('tab: events', tap('#pTabs [data-t="events"]'), 1200),
  S('tab: account', tap('#pTabs [data-t="me"]'), 1200),
  S('tab: account, bottom', `const s=document.getElementById('pScroll');s.scrollTop=s.scrollHeight;`),
  S('toilets', tap('#pTabs [data-t="home"]') + `setTimeout(()=>{const b=document.querySelector('[data-act="wc"]');if(b)b.click();},300);`, 2000),
  S('hindi: home', `resetAll();` + tap('#pTabs [data-t="home"]') + tap('#pLang'), 1500),
  S('hindi: store', `selectBrand('bellagio');`, 1800),
  S('hindi: route', tap('#pDest .getdir'), 2500),
  S('hindi: offers', tap('#rhEnd') + `resetAll();` + tap('#pTabs [data-t="offers"]'), 1500),
  S('hindi: account', tap('#pTabs [data-t="me"]'), 1200),
  S('back to English', tap('#pLang') + tap('#pTabs [data-t="home"]'), 1200),
];
const MEMBER = [
  S('member: home', `document.getElementById('pScroll').scrollTop=0;`, 800),
  S('member: account', tap('#pTabs [data-t="me"]'), 1200),
  S('member: account, scrolled', `const s=document.getElementById('pScroll');s.scrollTop=700;`),
  S('member: account, bottom', `const s=document.getElementById('pScroll');s.scrollTop=s.scrollHeight;`),
  S('member: card', `showCardSheet();`, 900),
  S('member: park sheet', closeModals + `parkSheet();`, 900),
  S('member: find my car', closeModals + `findMyCar();`, 2500),
  S('member: car route ended', `const e=document.getElementById('rhEnd');if(e)e.click();`, 1200),
  S('member: offers', `resetAll();` + tap('#pTabs [data-t="offers"]'), 1200),
  S('member: hindi account', tap('#pLang') + tap('#pTabs [data-t="me"]'), 1500),
  S('member: back to English', tap('#pLang') + tap('#pTabs [data-t="home"]'), 1000),
];
const kq = ch => `{const b=[...document.querySelectorAll('#kbd button')].find(x=>x.textContent===${JSON.stringify(ch)});if(b)b.click();}`;
const KIOSK = [
  S('home', `resetAll();`, 1200),
  S('home, panel bottom', `const b=document.getElementById('kBody');b.scrollTop=b.scrollHeight;`),
  S('search keyboard', `document.getElementById('kBody').scrollTop=0;` + tap('#q') + `document.getElementById('kbd').classList.add('open');`, 900),
  S('search "bel"', kq('B') + kq('E') + kq('L'), 1200),
  S('store: Bellagio', `document.getElementById('kbd').classList.remove('open');selectBrand('bellagio');`, 2000),
  S('store: steps', `const s=document.querySelector('#kBody .stepsbox');if(s)s.open=true;`, 900),
  S('store: QR card', `const h=document.querySelector('#kBody .handoff');if(h)h.scrollIntoView({block:'center'});`, 900),
  S('route: started', tap('#kBody .getdir'), 2500),
  S('route: next step', tap('#rhNext'), 1500),
  S('route: ended', tap('#rhEnd'), 1500),
  S('category: dining', `resetAll();` + tap('#kCats [data-g="dining"]'), 1500),
  S('tab: directory', tap('#kTabs [data-t="directory"]'), 1200),
  S('tab: directory, bottom', `const b=document.getElementById('kBody');b.scrollTop=b.scrollHeight;`),
  S('tab: offers', tap('#kTabs [data-t="offers"]'), 1200),
  S('tab: events', tap('#kTabs [data-t="events"]'), 1200),
  S('tab: services', tap('#kTabs [data-t="services"]'), 1200),
  S('hindi: home', `resetAll();` + tap('#kLang'), 1500),
  S('hindi: store', `selectBrand('bellagio');`, 2000),
  S('hindi: directory', tap('#kTabs [data-t="directory"]'), 1200),
  S('back to English', `resetAll();` + tap('#kLang'), 1200),
  S('help', `const h=document.getElementById('kHelp');if(h)h.click();`, 900),
];
const ADMIN = [S('sign-in', '', 1500), S('signed in', tap('#aHint button'), 2500)];
const SECTIONS = ['overview', 'stores', 'ads', 'kiosks', 'waits', 'offers', 'events', 'members', 'users', 'settings'];
SECTIONS.forEach(k => ADMIN.push(S('section: ' + k, `{const b=document.querySelector('[data-sec="${k}"]');if(b)b.click();}`, 1500),
  S('section: ' + k + ', bottom', `{const m=document.getElementById('aMain');if(m)m.scrollTop=m.scrollHeight;}`, 600)));
ADMIN.splice(5, 0, S('stores: edit one', `{const b=document.querySelector('#aMain [data-edit], #aMain .a-store, #aMain button[data-b]');if(b)b.click();}`, 1500));

const RUNS = [
  // [name, view, width, height, mobile, walk]
  ['phone 360x740', 'app', 360, 740, true, PHONE], ['phone 390x844', 'app', 390, 844, true, PHONE], ['phone 430x932', 'app', 430, 932, true, PHONE],
  ['tablet 820x1180', 'app', 820, 1180, false, PHONE.slice(0, 10)], ['desktop 1440x900', 'app', 1440, 900, false, PHONE], ['desktop 1280x720', 'app', 1280, 720, false, PHONE.slice(0, 12)],
  ['member 390x844', 'member', 390, 844, true, MEMBER], ['member desktop 1440x900', 'member', 1440, 900, false, MEMBER],
  ['kiosk 1920x1080', 'kiosk', 1920, 1080, false, KIOSK], ['kiosk 1366x768', 'kiosk', 1366, 768, false, KIOSK], ['kiosk portrait 1080x1920', 'kiosk', 1080, 1920, false, KIOSK],
  ['admin 1440x900', 'admin', 1440, 900, false, ADMIN], ['admin 1280x720', 'admin', 1280, 720, false, ADMIN],
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const only = process.env.ONLY ? new RegExp(process.env.ONLY, 'i') : null;
  const exe = BROWSERS.find(p => fs.existsSync(p)); if (!exe) throw new Error('no Chrome or Edge found');
  let member = null, c = null, br = null, prof = null; const report = []; let bad = 0;
  const closeBrowser = async () => { if (c) c.close(); if (br) br.kill(); c = br = null; await sleep(600); if (prof) try { fs.rmSync(prof, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 }); } catch (e) { } prof = null; };
  try {
    const s = await api('/api/member/start', 'POST', { phone: DEMO_PHONE }); if (!s.demo) throw new Error('the server is not in demo mode');
    const v = await api('/api/member/verify', 'POST', { phone: DEMO_PHONE, code: s.code });
    member = { tok: v.token, id: v.member.id };
    await api('/api/member/me', 'PUT', { name: 'Riya Kapoor', favs: ['nicobar', 'starbucks', 'goodearth', 'bellagio'], car: { level: 'B2', spot: 'C-114', note: 'Near Lift E, by the ramp' } }, { Authorization: 'Bearer ' + v.token });
    await api('/api/members/points', 'POST', { id: v.member.id, points: 12500, note: 'Welcome to membership', by: 'Concierge' }, { 'X-Admin-Key': adminKey() });
    let pageErrors = [];
    const evalJS = async js => { const r = await c.send('Runtime.evaluate', { expression: js, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).split('\n')[0]); return r.result.value; };
    for (const [name, view, w, h, mobile, walk] of RUNS) {
      if (only && !only.test(name)) continue;
      // a fresh browser for every run: Chrome blocks 3D for a site after a few dozen page loads, which is the test's doing
      const port = 9500 + Math.floor(Math.random() * 400); prof = fs.mkdtempSync(path.join(TMP, 'ui-audit-'));
      br = spawn(exe, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + prof, '--no-first-run', '--hide-scrollbars', '--mute-audio', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', 'about:blank'], { stdio: 'ignore' });
      c = await cdp(port); await c.send('Page.enable'); await c.send('Runtime.enable');
      c.on(m => {
        if (m.method === 'Runtime.exceptionThrown') pageErrors.push(((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text || '').split('\n')[0]);
        if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') pageErrors.push(m.params.args.map(a => a.value !== undefined ? a.value : (a.description || '')).join(' ').slice(0, 200));
      });
      const dir = path.join(OUT, name.replace(/[^a-z0-9]+/gi, '_')); fs.mkdirSync(dir, { recursive: true });
      await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
      await c.send('Page.navigate', { url: BASE + '/?view=app&lang=en&intro=0' }); await sleep(800);
      await evalJS(`localStorage.clear();sessionStorage.clear();localStorage.setItem('ireo.lang','en');${view === 'member' ? `localStorage.setItem('ireo.member',${JSON.stringify(member.tok)});` : ''}`);
      const url = (view === 'kiosk' ? '/?view=kiosk&attract=0&lang=en&lock=1&idle=900' : view === 'admin' ? '/?view=admin' : '/?view=app&lang=en') + '&intro=0';   // no intro film over the screenshots
      await c.send('Page.navigate', { url: BASE + url });
      for (let i = 0; i < 60; i++) { if (await evalJS(`!!window.APP_READY`).catch(() => false)) break; await sleep(250); }
      await sleep(view === 'admin' ? 1200 : 2500);
      if (view === 'member') for (let i = 0; i < 40; i++) { if (await evalJS(`!!(typeof Member!=='undefined'&&Member.on)`)) break; await sleep(250); }
      pageErrors = [];
      let k = 0;
      for (const [step, js, ms] of walk) {
        k++; let failed = null;
        try { if (js) await evalJS(`(async()=>{${js}})()`); } catch (e) { failed = e.message; }
        await sleep(ms);
        const a = await evalJS(AUDIT).catch(e => ({ issues: [{ kind: 'audit failed', text: e.message }], errors: 0 }));
        const shot = await c.send('Page.captureScreenshot', { format: 'jpeg', quality: 70 });
        const file = String(k).padStart(2, '0') + '_' + step.replace(/[^a-z0-9]+/gi, '_') + '.jpg';
        fs.writeFileSync(path.join(dir, file), Buffer.from(shot.data, 'base64'));
        const entry = { run: name, step, file: path.join(dir, file), failed, issues: a.issues, appErrors: a.errors, pageErrors: pageErrors.splice(0) };
        report.push(entry);
        const n = entry.issues.length + (failed ? 1 : 0) + entry.pageErrors.length;
        if (n) bad++;
        console.log((n ? 'ISSUES ' : 'ok     ') + name + ' | ' + step + (failed ? ' | STEP FAILED: ' + failed : '') + (entry.issues.length ? ' | ' + entry.issues.map(i => i.kind + ' ' + i.el + (i.text ? ' "' + i.text.slice(0, 40) + '"' : '')).slice(0, 4).join(' ; ') : '') + (entry.pageErrors.length ? ' | page errors: ' + entry.pageErrors.slice(0, 2).join(' ; ') : ''));
      }
      await closeBrowser();
    }
  } finally {
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
    await closeBrowser();
    if (member) try { await api('/api/members/' + member.id, 'DELETE', null, { 'X-Admin-Key': adminKey() }); console.log('demo member removed'); } catch (e) { console.log('could not remove the demo member', e.message); }
  }
  console.log('STEPS', report.length, 'WITH PROBLEMS', bad, 'REPORT', path.join(OUT, 'report.json'));
  process.exitCode = Math.min(bad, 100);
})().catch(e => { console.error('FAILED', e.message); process.exit(101); });
