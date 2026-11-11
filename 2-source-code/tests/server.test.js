/* Server tests: the member sign-in API, against a real server on a spare port with its own empty data folder.
   Run: node tests/server.test.js   (no dependencies; Node 18+) */
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),{spawn}=require('child_process');
const PORT=18765+Math.floor(Math.random()*500),BASE='http://127.0.0.1:'+PORT,KEY='test-admin-key';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ireo-test-'));
const srv=spawn(process.execPath,[path.join(__dirname,'..','server.js'),'--port',String(PORT)],{env:Object.assign({},process.env,{DATA_DIR:dir,ADMIN_KEY:KEY,ADMIN_HINT:'on',PORT:'',HOST:'127.0.0.1'}),stdio:'ignore'});
let pass=0,fail=0;
async function t(name,fn){try{await fn();pass++;console.log('  ok  '+name);}catch(e){fail++;console.log('  FAIL '+name+'\n       '+e.message);}}
const call=async(p,method,body,headers)=>{const r=await fetch(BASE+p,{method:method||'GET',headers:Object.assign(body?{'Content-Type':'application/json'}:{},headers||{}),body:body?JSON.stringify(body):undefined});
  let j=null;try{j=await r.json();}catch(e){}return {s:r.status,j};};
const auth=tok=>({Authorization:'Bearer '+tok}),admin={'X-Admin-Key':KEY};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  for(let i=0;i<50;i++){try{if((await fetch(BASE+'/healthz')).ok)break;}catch(e){}await sleep(100);}
  let token,id;const PHONE='98765 43210';
  console.log('member sign-in');
  await t('the admin password is shown to a page on this computer, never through a tunnel or proxy',async()=>{assert.strictEqual((await call('/api/admin/hint')).j.key,KEY);
    for(const h of [{'X-Forwarded-For':'203.0.113.9'},{'CF-Connecting-IP':'203.0.113.9'},{'Via':'1.1 proxy'}])assert.strictEqual((await call('/api/admin/hint','GET',null,h)).j.key,undefined,JSON.stringify(h));});
  await t('the server says it has members',async()=>{const r=await call('/api/info');assert(r.j.ok&&r.j.members===true);});
  await t('a number that is not an Indian mobile is refused',async()=>{for(const p of ['12345','5876543210',''])assert.strictEqual((await call('/api/member/start','POST',{phone:p})).s,400,p);});
  let code;
  await t('a good number gets a 6-digit code (demo mode says so and returns it)',async()=>{const r=await call('/api/member/start','POST',{phone:PHONE});assert.strictEqual(r.s,200);assert(r.j.demo===true&&/^\d{6}$/.test(r.j.code));code=r.j.code;});
  await t('asking again straight away is refused',async()=>{assert.strictEqual((await call('/api/member/start','POST',{phone:'+91'+PHONE.replace(/\D/g,'')})).s,429);});
  await t('a wrong code is refused, and so is a code for another number',async()=>{const wrong=code==='000000'?'000001':'000000';
    assert.strictEqual((await call('/api/member/verify','POST',{phone:PHONE,code:wrong})).s,401);assert.strictEqual((await call('/api/member/verify','POST',{phone:'9123456780',code})).s,400);});
  await t('the right code signs in and makes a new member with a 10-digit number',async()=>{const r=await call('/api/member/verify','POST',{phone:PHONE,code});assert.strictEqual(r.s,200);
    assert(r.j.isNew===true&&/^[a-f0-9]{64}$/.test(r.j.token)&&/^\d{10}$/.test(r.j.member.id));assert.strictEqual(r.j.member.points,0);assert(!/43210/.test(r.j.member.phone.replace(/210$/,'')),'phone not masked: '+r.j.member.phone);token=r.j.token;id=r.j.member.id;});
  await t('a code works once',async()=>{assert.strictEqual((await call('/api/member/verify','POST',{phone:PHONE,code})).s,400);});
  await t('the member can read and change their own record; what they send is cleaned',async()=>{assert.strictEqual((await call('/api/member/me')).s,401);assert.strictEqual((await call('/api/member/me','GET',null,auth('0'.repeat(64)))).s,401);
    const r=await call('/api/member/me','PUT',{name:'  Asha <b>Rao</b>\n',favs:['starbucks','starbucks','bad id!',5,'nicobar'],prefs:{lang:'hi',stepFree:1,evil:true},points:9999,id:'1'},auth(token));
    assert.strictEqual(r.s,200);assert.strictEqual(r.j.member.name,'Asha bRao/b');assert.deepStrictEqual(r.j.member.favs,['starbucks','nicobar']);assert.deepStrictEqual(r.j.member.prefs,{lang:'hi',stepFree:true});
    assert.strictEqual(r.j.member.points,0,'a member cannot give themselves points');assert.strictEqual(r.j.member.id,id);});
  await t('a member can save where they parked, change it and clear it',async()=>{
    assert.strictEqual((await call('/api/member/me','PUT',{car:{level:'',spot:'P23'}},auth(token))).s,400);assert.strictEqual((await call('/api/member/me','PUT',{car:{level:'B1',spot:'  '}},auth(token))).s,400);
    let r=await call('/api/member/me','PUT',{car:{level:'b-1',spot:'Pillar <P-23>',note:'near the lifts',at:'1999-01-01'}},auth(token));assert.strictEqual(r.s,200);
    assert.strictEqual(r.j.member.car.level,'B1');assert.strictEqual(r.j.member.car.spot,'Pillar P-23');assert.strictEqual(r.j.member.car.note,'near the lifts');assert(Date.now()-Date.parse(r.j.member.car.at)<60000,'the time is the server\'s');
    r=await call('/api/member/me','GET',null,auth(token));assert.strictEqual(r.j.member.car.spot,'Pillar P-23');
    r=await call('/api/member/me','PUT',{name:'Asha Rao'},auth(token));assert.strictEqual(r.j.member.car.level,'B1','other changes keep the car');
    r=await call('/api/member/me','PUT',{car:null},auth(token));assert.strictEqual(r.j.member.car,null);
    assert.strictEqual((await call('/api/member/me','PUT',{car:{level:'B2',spot:'C-14'}})).s,401,'only the member');});
  console.log('the mall\'s side');
  await t('the list of members needs the admin password',async()=>{assert.strictEqual((await call('/api/members')).s,401);assert.strictEqual((await call('/api/members','GET',null,auth(token))).s,401);
    const r=await call('/api/members','GET',null,admin);assert.strictEqual(r.s,200);assert.strictEqual(r.j.members.length,1);assert.strictEqual(r.j.members[0].phone,'+919876543210');assert.strictEqual(r.j.demo,true);});
  await t('the mall can add and take points, never below zero, and the member sees it',async()=>{assert.strictEqual((await call('/api/members/points','POST',{id,points:50,note:'Welcome'})).s,401);
    assert.strictEqual((await call('/api/members/points','POST',{id,points:50,note:'Welcome',by:'Concierge'},admin)).j.points,50);assert.strictEqual((await call('/api/members/points','POST',{id,points:-20,note:'Redeemed'},admin)).j.points,30);
    assert.strictEqual((await call('/api/members/points','POST',{id,points:-31},admin)).s,400);assert.strictEqual((await call('/api/members/points','POST',{id,points:0},admin)).s,400);assert.strictEqual((await call('/api/members/points','POST',{id:'0000000000',points:5},admin)).s,404);
    const me=(await call('/api/member/me','GET',null,auth(token))).j.member;assert.strictEqual(me.points,30);assert.strictEqual(me.log.length,2);assert.strictEqual(me.log[0].points,-20);assert.strictEqual(me.log[1].note,'Welcome');});
  console.log('privacy');
  await t('members are not in the live data that every screen receives',async()=>{const r=await call('/api/poll?since=0');const s=JSON.stringify(r.j);assert(!s.includes('9876543210')&&!s.includes(id)&&!('members' in r.j.snapshot));
    assert.strictEqual((await call('/api/db/members/x','PUT',{a:1},admin)).s,400);});
  await t('the file on disk keeps no sign-in token or code',async()=>{await sleep(500);const f=fs.readFileSync(path.join(dir,'members.json'),'utf8');assert(f.includes('+919876543210'));assert(!f.includes(token)&&!f.includes(code));});
  await t('signing out ends the session; signing in again finds the same member',async()=>{assert.strictEqual((await call('/api/member/logout','POST',null,auth(token))).s,200);assert.strictEqual((await call('/api/member/me','GET',null,auth(token))).s,401);
    await sleep(20500);const c2=(await call('/api/member/start','POST',{phone:PHONE})).j.code;const r=await call('/api/member/verify','POST',{phone:PHONE,code:c2});assert(r.j.ok&&r.j.isNew===false&&r.j.member.id===id&&r.j.member.points===30);token=r.j.token;});
  await t('the mall can remove a member, and their session goes with them',async()=>{assert.strictEqual((await call('/api/members/'+id,'DELETE',null,admin)).s,200);assert.strictEqual((await call('/api/member/me','GET',null,auth(token))).s,401);
    assert.strictEqual((await call('/api/members','GET',null,admin)).j.members.length,0);});
  srv.kill();await sleep(300);try{fs.rmSync(dir,{recursive:true,force:true});}catch(e){}
  console.log('\n'+pass+' passed, '+fail+' failed');process.exit(fail?1:0);
})().catch(e=>{console.error(e);srv.kill();process.exit(1);});
