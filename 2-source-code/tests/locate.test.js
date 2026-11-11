/* Live-position tests: simulated visitors walk real routes while the phone "hears" the planned beacons
   (signal model + noise in locate.js), and the tracker has to keep the dot on them.
   Run: node tests/locate.test.js   (no dependencies). Add "report" for the accuracy table by beacon spacing.
   A simulation cannot stand in for the building: these numbers say the maths and the beacon plan are sound,
   the pilot says what real walls, crowds and phones do to them. */
const assert=require('assert');
const E=require('./load-engine.js')();
const Locate=require('../web/js/locate.js');
let pass=0,fail=0;
function t(name,fn){try{fn();pass++;console.log('  ok  '+name);}catch(e){fail++;console.log('  FAIL '+name+'\n       '+e.message);}}
const targets=b=>E.unitsOfBrand(b).map(u=>'u:'+u.key);
const SC=E.SC,pct=(a,p)=>{const s=a.slice().sort((x,y)=>x-y);return s.length?s[Math.min(s.length-1,Math.floor(s.length*p))]:NaN;};
/* walk a route at 1.2 m/s, one scan a second; rides take 12 s, half on each floor */
const GRID=E.walkGrid();
function walk(route,beacons,seed,simOpts){const rand=Locate.seeded(seed),tr=Locate.tracker(beacons,{grid:GRID});
  const err=[],res={err,floorOk:0,floorN:0,fixes:[]};let time=0;
  const scan=(pos,count)=>{const fix=tr.update(Locate.simulate(beacons,pos,rand,simOpts),time*1000);time+=1;
    if(fix)res.fixes.push({fix:Object.assign({},fix),pos});
    if(!count||!fix)return;res.floorN++;if(fix.f!==pos.f)return;res.floorOk++;err.push(Math.hypot(fix.x-pos.x,fix.y-pos.y)*SC);};
  route.legs.forEach((leg,li)=>{
    if(li){const a=route.legs[li-1].pts.slice(-1)[0],b=leg.pts[0];for(let s=0;s<12;s++)scan(s<6?{f:route.legs[li-1].f,x:a[0],y:a[1]}:{f:leg.f,x:b[0],y:b[1]},false);}
    let since=0;
    for(let i=1;i<leg.pts.length;i++){const a=leg.pts[i-1],b=leg.pts[i],L=Math.hypot(b[0]-a[0],b[1]-a[1])*SC;
      for(let d=0;d<L;d+=1.2){scan({f:leg.f,x:a[0]+(b[0]-a[0])*d/L,y:a[1]+(b[1]-a[1])*d/L},since>=3);since++;}}});
  return res;}
function survey(beacons,simOpts){const all=[];let ok=0,n=0;
  E.brandKeys().forEach((b,i)=>{for(const from of ['kiosk','ent:main']){const r=E.routeTo(targets(b),{from});if(!r)continue;
    const w=walk(r,beacons,1000+i*7+(from==='kiosk'?0:3),simOpts);all.push(...w.err);ok+=w.floorOk;n+=w.floorN;}});
  return {median:pct(all,0.5),p90:pct(all,0.9),floor:ok/n,n:all.length};}

const BEACONS=E.planBeacons();
console.log('beacon plan');
t('every walkway point is within about 5.5 m of a beacon on its floor (planned to the nearest metre)',()=>{for(const f of E.FLOOR_ORDER){const B=BEACONS.filter(b=>b.f===f);
  E.walkEdges(f).forEach(e=>{for(let k=0;k<=10;k++){const p=[e.A[0]+(e.B[0]-e.A[0])*k/10,e.A[1]+(e.B[1]-e.A[1])*k/10];
    const d=Math.min(...B.map(b=>Math.hypot(b.x-p[0],b.y-p[1])))*SC;assert(d<=6.2,f+' walkway point '+d.toFixed(1)+' m from the nearest beacon');}});}});
t('every lift and escalator landing and the entrance has a beacon within 3 m',()=>{E.DATA.CONNECTORS.forEach(c=>{for(const f in c.at){const s=E.snapToWalk(f,c.at[f][0],c.at[f][1]);
  const d=Math.min(...BEACONS.filter(b=>b.f===f).map(b=>Math.hypot(b.x-s.x,b.y-s.y)))*SC;assert(d<=3,c.id+' on '+f+': '+d.toFixed(1)+' m');}});
  const e=E.DATA.FLOORS.G.entrances[0],s=E.snapToWalk('G',e.x,e.y);assert(Math.min(...BEACONS.filter(b=>b.f==='G').map(b=>Math.hypot(b.x-s.x,b.y-s.y)))*SC<=3);});
t('beacon ids are unique, numbered per floor, and the plan is the same every time',()=>{const ids=new Set(BEACONS.map(b=>b.id));assert.strictEqual(ids.size,BEACONS.length);
  BEACONS.forEach(b=>{assert(/^(G|1F|2F)-\d\d+$/.test(b.id),b.id);assert(b.major>=1&&b.major<=3&&b.minor>=1);});
  assert.deepStrictEqual(JSON.stringify(E.planBeacons()),JSON.stringify(BEACONS));});
t('no beacon is planned inside a shop',()=>{BEACONS.forEach(b=>{const u=E.UNITS.find(u=>u.f===b.f&&u.b&&E.pointInPoly([b.x,b.y],u.pts));assert(!u,b.id+' is inside '+(u&&u.key));});});

console.log('the visitor as a starting point');
t('a route can start from wherever the visitor is, on any floor',()=>{for(const [f,x,y] of [['G',380,900],['F',300,800],['S',344,772]]){const me=E.setMe(f,x,y);assert(me&&me.f===f);
  for(const b of ['cinepolis','starbucks','masaba']){const r=E.routeTo(targets(b),{from:'me'});assert(r&&r.from==='me',b+' from '+f);assert.strictEqual(r.legs[0].f,f);}}});
t('moving the visitor leaves no trace in the walk graph',()=>{const n0=Object.keys(E.GRAPH.nodes).length;for(let i=0;i<50;i++)E.setMe('G',300+i*3,700+i*5);
  assert(Object.keys(E.GRAPH.nodes).length<=n0+1);const r=E.routeTo(targets('cinepolis'));assert(r&&r.from==='kiosk');});
t('a position off the walkway is pulled onto it; a bad one is refused',()=>{const me=E.setMe('G',380,900);assert(me.off>=0&&E.snapToWalk('G',me.x,me.y).m<0.05);assert.strictEqual(E.setMe('Z',1,1),null);assert.strictEqual(E.setMe('G',NaN,1),null);});

console.log('following a route');
t('progress along a route grows as the visitor walks it, and stays on the line',()=>{const r=E.routeTo(targets('cinepolis'));let last=null;
  r.legs.forEach((leg,li)=>{let prev=-1;for(let i=1;i<leg.pts.length;i++){const a=leg.pts[i-1],b=leg.pts[i];for(let k=0;k<=4;k++){
    const p=E.routeProgress(r,leg.f,a[0]+(b[0]-a[0])*k/4,a[1]+(b[1]-a[1])*k/4,last);assert(p&&p.leg===li,'lost on leg '+li);assert(p.off<0.5);assert(p.m>=prev-0.01,'went backwards');prev=p.m;last=p;}}});});
t('a visitor who wanders off is seen to be off the route; on a floor the route does not use, there is no answer',()=>{const r=E.routeTo(targets('masaba'));const a=r.legs[0].pts[0];
  assert(E.routeProgress(r,'G',a[0]+200,a[1]+200).off>15);assert.strictEqual(E.routeProgress(r,'S',a[0],a[1]),null);});

console.log('positioning (simulated walks: every store, from the kiosk and from the entrance)');
const S=survey(BEACONS);
t('the dot is within 3 m of the visitor half the time and within 6 m nine times in ten',()=>{assert(S.n>3000,'too few fixes: '+S.n);
  assert(S.median<3,'median error '+S.median.toFixed(2)+' m');assert(S.p90<6,'90th percentile error '+S.p90.toFixed(2)+' m');});
t('the dot is on the right floor at least 97% of the time',()=>{assert(S.floor>=0.97,'right floor '+(S.floor*100).toFixed(1)+'%');});
t('after an escalator or lift the dot is on the new floor within a few seconds',()=>{const r=E.routeTo(targets('cinepolis'));assert(r.legs.length>1);
  const w=walk(r,BEACONS,42),f2=r.legs[1].f;const i0=w.fixes.findIndex(x=>x.pos.f===f2);const i1=w.fixes.findIndex((x,i)=>i>=i0&&x.fix.f===f2);assert(i1>=0&&i1-i0<=4,'took '+(i1-i0)+' s');});
t('once it has settled, the dot never moves faster than a brisk walk',()=>{const r=E.routeTo(targets('bellagio'));const w=walk(r,BEACONS,7);
  for(let i=6;i<w.fixes.length;i++){const a=w.fixes[i-1].fix,b=w.fixes[i].fix;if(a.f!==b.f)continue;const v=Math.hypot(b.x-a.x,b.y-a.y)*SC/Math.max(0.05,(b.t-a.t)/1000);assert(v<=2.6,'moved at '+v.toFixed(1)+' m/s');}});
t('much noisier signals (8 dB, a third of packets lost): still within 4.5 m half the time, on the right floor',()=>{const N=survey(BEACONS,{sigma:8,loss:0.35});assert(N.median<4.5,'median '+N.median.toFixed(2));assert(N.p90<9,'p90 '+N.p90.toFixed(2));assert(N.floor>=0.97,'floor '+(N.floor*100).toFixed(1)+'%');});
t('a phone that hears everything 8 dB quieter, or 6 dB louder, is learnt and still followed',()=>{const q=survey(BEACONS,{bias:-8}),l=survey(BEACONS,{bias:6});
  assert(q.median<4.5&&q.floor>=0.97,'quiet phone: median '+q.median.toFixed(2)+', floor '+(q.floor*100).toFixed(1)+'%');assert(l.median<3&&l.floor>=0.97,'loud phone: median '+l.median.toFixed(2));});
t('a building where signals fade faster or slower than assumed (before calibration) still works',()=>{for(const n of [2.0,3.0]){const r=survey(BEACONS,{n});assert(r.median<3.5&&r.floor>=0.97,'n='+n+': median '+r.median.toFixed(2)+', floor '+(r.floor*100).toFixed(1)+'%');}});
t('with only every other beacon (165 instead of 222) the dot is still within 3.5 m half the time',()=>{const B2=E.planBeacons({radius:7.5});assert(B2.length<BEACONS.length*0.8);const r=survey(B2);assert(r.median<3.5&&r.p90<7&&r.floor>=0.97,'median '+r.median.toFixed(2)+' p90 '+r.p90.toFixed(2));});
t('a phone that hears nothing gets no position, and one that stops hearing loses it',()=>{const tr=Locate.tracker(BEACONS,{grid:GRID});assert.strictEqual(tr.update([],0),null);const pos={f:'G',x:372,y:900},rand=Locate.seeded(5);
  let fix=null;for(let s=1;s<=6;s++)fix=tr.update(Locate.simulate(BEACONS,pos,rand),s*1000);assert(fix&&fix.f==='G','no fix after 6 s');assert.strictEqual(tr.update([],30000),null);});
t('readings from unknown beacons are ignored',()=>{const tr=Locate.tracker(BEACONS,{grid:GRID});assert.strictEqual(tr.update([{id:'nope',rssi:-40},{id:BEACONS[0].id,rssi:'x'}],0),null);assert.strictEqual(tr.update([{id:'nope',rssi:-40}],1000),null);});
t('a visitor standing still is found within a few seconds and the dot stays with them',()=>{for(const pos of [{f:'G',x:372,y:1176},{f:'G',x:372,y:699},{f:'G',x:596,y:230},{f:'F',x:244,y:857},{f:'S',x:344,y:772}]){
  const err=[];for(let seed=1;seed<=10;seed++){const rand=Locate.seeded(seed*97),tr=Locate.tracker(BEACONS,{grid:GRID});
    for(let s=0;s<40;s++){const fix=tr.update(Locate.simulate(BEACONS,pos,rand),s*1000);if(s===5)assert(fix,'no position after 5 s');if(s>=5){assert.strictEqual(fix.f,pos.f,'wrong floor');err.push(Math.hypot(fix.x-pos.x,fix.y-pos.y)*SC);}}}
  assert(pct(err,0.5)<2.5,'median '+pct(err,0.5).toFixed(1)+' m at '+JSON.stringify(pos));assert(pct(err,1)<9,'worst '+pct(err,1).toFixed(1)+' m at '+JSON.stringify(pos));}});

if(process.argv.includes('report')){console.log('\nsimulated accuracy by beacon spacing (noise 5 dB, 20% of packets lost)');
  for(const radius of [4.5,5.5,6.5,7.5,9]){const B=E.planBeacons({radius}),r=survey(B);
    console.log('  no walkway point further than '+radius+' m from a beacon: '+String(B.length).padStart(3)+' beacons, median '+r.median.toFixed(1)+' m, 90% within '+r.p90.toFixed(1)+' m, right floor '+(r.floor*100).toFixed(1)+'%');}}
console.log('\n'+pass+' passed, '+fail+' failed');if(fail)process.exit(1);
