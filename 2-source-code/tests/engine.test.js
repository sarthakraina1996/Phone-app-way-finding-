/* Engine tests: routing, directions and search against the real mall data.
   Run: node tests/engine.test.js   (no dependencies) */
const assert=require('assert');
const load=require('./load-engine.js');
const E=load();
let pass=0,fail=0;
function t(name,fn){try{fn();pass++;console.log('  ok  '+name);}catch(e){fail++;console.log('  FAIL '+name+'\n       '+e.message);}}
const targets=b=>E.unitsOfBrand(b).map(u=>'u:'+u.key);

console.log('routing');
t('every store with a unit can be reached from the kiosk',()=>{for(const b of E.brandKeys())assert(E.routeTo(targets(b)),'no route to '+b);});
t('every store can be reached step-free, using lifts only',()=>{for(const b of E.brandKeys()){const r=E.routeTo(targets(b),{stepFree:true});assert(r,'no step-free route to '+b);
  r.legs.forEach((l,i)=>{if(i)assert.strictEqual(l.ride.type,'lift',b+' uses an escalator');});}});
t('every store can be reached from the main entrance',()=>{for(const b of E.brandKeys())assert(E.routeTo(targets(b),{from:'ent:main'}),'no route to '+b);});
t('routes never pass through another shop',()=>{for(const b of E.brandKeys()){const r=E.routeTo(targets(b));const ids=[];let cur='poi:'+r.target;const {P}=E.shortestTree('poi:kiosk',false);
  while(cur){ids.push(cur);cur=P[cur];}ids.slice(1,-1).forEach(id=>assert(!id.startsWith('poi:u:'),b+' walks through '+id));}});
t('escalators only link neighbouring floors',()=>{const r=E.routeTo(targets('bellagio'));r.legs.forEach((l,i)=>{if(i&&l.ride.type==='esc')assert.strictEqual(Math.abs(E.DATA.FLOORS[l.f].idx-E.DATA.FLOORS[r.legs[i-1].f].idx),1);});});
t('a multi-floor store is reached on the nearest floor',()=>{const r=E.routeTo(targets('goodearth'));assert.strictEqual(r.legs.length,1);assert.strictEqual(r.legs[0].f,'G');});
t('walking times are plausible (1-5 min for this mall)',()=>{for(const b of E.brandKeys()){const s=E.routeStats(E.routeTo(targets(b)));assert(s.min>=1&&s.min<=5,b+' '+s.min+' min');assert(s.m>=5&&s.m<=400,b+' '+s.m+' m');}});
t('distances are rounded to 5 m',()=>{const s=E.routeStats(E.routeTo(targets('masaba')));assert.strictEqual(s.m%5,0);});
t('the route to a unit is null only when there is no such unit',()=>{assert.strictEqual(E.routeTo(['u:G:nope']),null);assert.strictEqual(E.routeTo([]),null);});
t('the kiosk position can be moved with ?at=',()=>{const K=load('?at=F,300,780&heading=90');assert.strictEqual(K.KIOSK.f,'F');const r=K.routeTo(K.unitsOfBrand('cinepolis').map(u=>'u:'+u.key));assert(r&&r.legs[0].f==='F');});
t('a bad ?at= falls back to the default kiosk',()=>{const K=load('?at=Z,foo,1');assert.strictEqual(K.KIOSK.f,'G');});

console.log('directions');
t('every route ends with the destination and says which side it is on',()=>{for(const b of E.brandKeys()){const st=E.directions(E.routeTo(targets(b)),{dest:'X'});const last=st[st.length-1];
  assert(last.end&&/^X is (on your (left|right)|straight ahead|right here)$/.test(last.t),b+': '+last.t);}});
t('floor changes say lift or escalator, up or down, and which floor',()=>{const st=E.directions(E.routeTo(targets('cinepolis')),{dest:'Cinépolis'});
  const ride=st.find(s=>s.ride);assert(ride,'no ride step');assert(/^Take the (lift|escalator) (up|down) to the (first|second|ground) floor$/.test(ride.t),ride.t);});
t('turn steps have distances and never say "0 m"',()=>{for(const b of E.brandKeys())E.directions(E.routeTo(targets(b)),{dest:'X'}).forEach(s=>{if(s.m!==undefined)assert(s.m>=2,b+': '+s.t+' '+s.m);});});
t('the first step from the kiosk uses the way the kiosk faces',()=>{const A=load('?heading=0'),B=load('?heading=180');const a=A.directions(A.routeTo(A.unitsOfBrand('masaba').map(u=>'u:'+u.key)),{})[0].t,b=B.directions(B.routeTo(B.unitsOfBrand('masaba').map(u=>'u:'+u.key)),{})[0].t;
  assert.notStrictEqual(a.split(' ')[0],b.split(' ')[0],'same first word for opposite headings: '+a+' / '+b);});

t('every step knows where it happens, in order along the route',()=>{for(const b of E.brandKeys()){const st=E.directions(E.routeTo(targets(b)),{dest:'X'});
  st.forEach((s,i)=>{assert(typeof s.leg==='number'&&typeof s.at==='number',b+' step without position');assert(s.say&&s.say.endsWith('.'));if(i)assert(s.leg>st[i-1].leg||s.at>=st[i-1].at,b+' steps out of order');});}});
t('the walker is on the right step as it moves',()=>{const st=E.directions(E.routeTo(targets('cinepolis')),{});assert.strictEqual(E.stepAt(st,0,0),0);assert.strictEqual(st[E.stepAt(st,1,0)].leg,1);assert(st[E.stepAt(st,9,1e9)].end);});
t('spoken steps flow: whole sentences, no "walk ... then walk", no stretch under 4 m between two turns',()=>{for(const b of E.brandKeys()){const st=E.directions(E.routeTo(targets(b)),{dest:'X'});
  st.forEach((s,i)=>{assert(/^[A-Z].*\.$/.test(s.say),b+': '+s.say);assert(!/walk.*then walk/i.test(s.say),b+': '+s.say);
    const n=st[i+1];if(n&&!s.ride&&!n.ride&&!n.end&&s.leg===n.leg&&i>0)assert(n.at-s.at>=3.5,b+': steps '+i+' and '+(i+1)+' only '+(n.at-s.at).toFixed(1)+' m apart');});}});
t('two turns in a row never name the same shop',()=>{for(const b of E.brandKeys()){const st=E.directions(E.routeTo(targets(b)),{dest:'X'});
  for(let i=1;i<st.length;i++){const a=/ at (.+)$/.exec(st[i-1].t),c=/ at (.+)$/.exec(st[i].t);if(a&&c&&st[i].leg===st[i-1].leg)assert(a[1]!==c[1],b+': '+st[i].t);}}});
console.log('hindi');
/* Hindi: everything is Devanagari except the shop names, every spoken step is a whole sentence ending in ।,
   and nothing assumes the visitor's gender (only the polite imperative -इए, no आ गए/गई, गया/गयी) */
const hiOf=b=>E.directions(E.routeTo(targets(b)),{dest:E.DATA.BRANDS[b].name,lang:'hi'});
const shopNames=Object.values(E.DATA.BRANDS).map(B=>B.name).sort((a,b)=>b.length-a.length);
const bare=s=>{shopNames.forEach(n=>{s=s.split(n).join('');});return s;};
t('Hindi directions: Devanagari apart from shop names, whole sentences, gender-neutral',()=>{for(const b of E.brandKeys()){const st=hiOf(b);
  st.forEach(s=>{assert(/[\u0900-\u097F]/.test(s.t)&&!/[A-Za-z]/.test(bare(s.t)),b+': '+s.t);assert(s.say.endsWith('।')&&!/[A-Za-z]/.test(bare(s.say)),b+': '+s.say);
    assert(!/undefined|NaN|  /.test(s.t+s.say),b+': '+s.say);assert(!/(गए|गई|गया|गयी|गयीं)(\s|।|$)/.test(s.say),b+' assumes a gender: '+s.say);});
  const last=st[st.length-1];assert(last.end&&/ (आपकी (दाईं|बाईं) ओर|सीधे सामने|यहीं) है$/.test(last.t),b+': '+last.t);}});
t('Hindi and English give the same steps in the same places',()=>{for(const b of E.brandKeys()){const en=E.directions(E.routeTo(targets(b)),{dest:'X'}),hi=hiOf(b);
  assert.strictEqual(hi.length,en.length,b);hi.forEach((s,i)=>{assert.strictEqual(s.ic,en[i].ic);assert.strictEqual(s.at,en[i].at);assert.strictEqual(s.m,en[i].m);});}});
t('Hindi floor changes name the floor the way people say it',()=>{const ride=hiOf('cinepolis').find(s=>s.ride);
  assert(/^(लिफ्ट|एस्केलेटर) से (ऊपर|नीचे) (ग्राउंड फ़्लोर|पहली मंज़िल|दूसरी मंज़िल) पर जाइए$/.test(ride.t),ride.t);});
console.log('new shops');
t('a shop added in an empty unit can be found and routed to, and removed again',()=>{const K=load();const u=K.vacantUnits()[0];assert(K.registerStore('newshop',{name:'New Shop',cat:'fashion',units:[u.key]}));
  assert(K.routeTo(K.unitsOfBrand('newshop').map(x=>'u:'+x.key)));assert.strictEqual(K.searchBrands('new shop')[0].b,'newshop');assert(K.unregisterStore('newshop'));assert.strictEqual(K.unitsOfBrand('newshop').length,0);});
t('a new shop cannot take a unit or a name that belongs to a plan brand',()=>{const K=load();assert(!K.registerStore('starbucks',{name:'x'}));const taken=K.unitsOfBrand('masaba')[0].key;K.registerStore('grab',{name:'Grab',units:[taken]});assert.strictEqual(K.unitsOfBrand('grab').length,0);});

console.log('escalators');
t('every escalator is built once, on the floor it leaves, and none rises from the top floor',()=>{
  const runs=E.FLOOR_ORDER.flatMap(f=>E.escalatorRuns(f));
  for(const c of E.DATA.CONNECTORS.filter(c=>c.type==='esc')){const fl=Object.keys(c.at).sort((a,b)=>E.FLOORS[a].idx-E.FLOORS[b].idx);
    const mine=runs.filter(r=>r.conn===c.id);assert.strictEqual(mine.length,1,c.id+': '+mine.length+' runs');assert.strictEqual(mine[0].f,fl[0],c.id+' built on '+mine[0].f);}
  const top=E.FLOOR_ORDER.find(f=>E.FLOORS[f].idx===Math.max(...E.FLOOR_ORDER.map(k=>E.FLOORS[k].idx)));assert.strictEqual(E.escalatorRuns(top).length,0);});
t('escalators rise towards where they arrive, and are long enough to be walked (under ~35 degrees for a 5.3 m storey)',()=>{
  for(const f of E.FLOOR_ORDER)for(const r of E.escalatorRuns(f)){const k=r.axis==='x'?0:1;assert(Math.abs(r.dir)===1);assert((r.r[k+2]-r.r[k])*0.16>=11,f+' '+r.conn+' too short');
    const c=E.DATA.CONNECTORS.find(x=>x.id===r.conn);if(!c)continue;const up=Object.keys(c.at).find(x=>x!==f);const off=c.at[up][k]-(r.r[k]+r.r[k+2])/2;if(Math.abs(off)>=3)assert.strictEqual(Math.sign(off),r.dir,r.conn+' rises the wrong way');}});
console.log('upper floors: glass rails over the voids');
const cross=(a,b,c,d)=>{const o=(p,q,r)=>Math.sign((q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]));return o(a,b,c)*o(a,b,d)<0&&o(c,d,a)*o(c,d,b)<0;};
t('the upper floors have rails and the ground floor has none',()=>{assert(E.voidRails('F').length>10&&E.voidRails('S').length>10);assert.strictEqual(E.voidRails('G').length,0);});
t('no rail crosses a walking route',()=>{for(const f of ['F','S']){const rails=E.voidRails(f);
  for(const id in E.GRAPH.adj){const A=E.GRAPH.nodes[id];if(A.f!==f)continue;
    E.GRAPH.adj[id].forEach(e=>{const B=E.GRAPH.nodes[e.to];if(!B||B.f!==f)return;
      rails.forEach(r=>assert(!cross(r.a,r.b,[A.x,A.y],[B.x,B.y]),`${f}: rail crosses the path ${id} -> ${e.to}`));});}}});
t('rails face open space, never a shop or a walkway',()=>{for(const f of ['F','S'])E.voidRails(f).forEach(r=>{const m=[(r.a[0]+r.b[0])/2+r.n[0]*1.6,(r.a[1]+r.b[1])/2+r.n[1]*1.6];
  assert(!E.FLOORS[f].units.some(u=>E.pointInPoly(m,u.pts)),f+' rail faces a shop');});});
t('no ground-floor tree stands under an upper floor',()=>{assert(!E.coveredAbove(-9999,-9999));assert(E.coveredAbove(...E.FLOORS.F.units[0].c));});

console.log('search');
const top=q=>(E.searchBrands(q)[0]||{}).b;
t('exact names',()=>{assert.strictEqual(top('Starbucks'),'starbucks');assert.strictEqual(top('good earth'),'goodearth');});
t('prefixes while typing',()=>{assert.strictEqual(top('nico'),'nicobar');assert.strictEqual(top('good ea'),'goodearth');});
t('typos',()=>{assert.strictEqual(top('starbuks'),'starbucks');assert.strictEqual(top('nicobr'),'nicobar');assert.strictEqual(top('cinepols'),'cinepolis');});
t('accents are ignored',()=>{assert.strictEqual(top('cinepolis'),'cinepolis');});
t('what people ask for, not just names',()=>{assert(['starbucks','bluetokai'].includes(top('coffee')));assert.strictEqual(top('movie'),'cinepolis');assert(E.searchBrands('salon').some(r=>r.b==='geetanjali'));});
t('unit numbers',()=>{const r=E.searchBrands('15-A').map(x=>x.b);assert(r.length>0);});
t('nonsense finds nothing',()=>{assert.strictEqual(E.searchBrands('xyzzy').length,0);});
t('facilities',()=>{assert.strictEqual(E.searchFacility('toilets').kind,'wc');assert.strictEqual(E.searchFacility('mens toilet').g,'m');assert.strictEqual(E.searchFacility('elevator').kind,'lift');assert.strictEqual(E.searchFacility('way out').kind,'exit');assert.strictEqual(E.searchFacility('masaba'),null);});

t('Hindi search words, with or without the nukta',()=>{const top=q=>(E.searchBrands(q)[0]||{}).b;
  assert(['starbucks','bluetokai'].includes(top('कॉफ़ी'))&&['starbucks','bluetokai'].includes(top('कॉफी')),'कॉफ़ी');assert.strictEqual(E.DATA.BRANDS[top('सिनेमा')].cat,'cinema');
  assert.strictEqual(E.searchFacility('शौचालय').kind,'wc');assert.strictEqual(E.searchFacility('महिला शौचालय').g,'f');assert.strictEqual(E.searchFacility('पुरुष टॉयलेट').g,'m');
  assert.strictEqual(E.searchFacility('लिफ्ट').kind,'lift');assert.strictEqual(E.searchFacility('निकास').kind,'exit');});
console.log('member card');
t('the barcode reads back as the member number',()=>{const read=bars=>{const el=bars.slice(1,-1);assert.strictEqual(el.slice(0,4).map(e=>e[1]).join(),'2,2,2,2','start');assert.strictEqual(el.slice(-3).map(e=>e[1]).join(),'5,2,2','stop');
    const body=el.slice(4,-3),pat=['00110','10001','01001','11000','00101','10100','01100','00011','10010','01010'];let out='';
    for(let i=0;i<body.length;i+=10){const a=[],b=[];for(let k=0;k<5;k++){assert.strictEqual(body[i+2*k][0],1);assert.strictEqual(body[i+2*k+1][0],0);a.push(body[i+2*k][1]===5?1:0);b.push(body[i+2*k+1][1]===5?1:0);}
      assert.strictEqual(a.reduce((x,y)=>x+y),2,'two wide bars');assert.strictEqual(b.reduce((x,y)=>x+y),2,'two wide spaces');out+=pat.indexOf(a.join(''))+''+pat.indexOf(b.join(''));}return out;};
  for(const n of ['1234567890','9081726354','0000000000','4827'])assert.strictEqual(read(E.itfBars(n)),n);assert.strictEqual(read(E.itfBars('123')),'0123');assert.strictEqual(E.itfBars('').length,0);
  const b=E.itfBars('1234567890');assert(b[0][0]===0&&b[0][1]>=20&&b[b.length-1][0]===0,'quiet zones');});
console.log('dates');
t('local date, not UTC',()=>{const d=new Date(2026,8,27,1,30);assert.strictEqual(E.localISO(d),'2026-09-27');});

console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
