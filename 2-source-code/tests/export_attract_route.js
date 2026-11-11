// Writes blender/attract_route.json: the route the kiosk really gives from "You are here" to Bellagio (2F),
// taken from the product's own router, so the attract film draws the same path. Run after changing the
// floor data or the kiosk position:   node tests/export_attract_route.js
const fs=require('fs'),path=require('path');
const E=require('./load-engine.js')();
const brand='bellagio';
const units=E.unitsOfBrand(brand);
const r=E.routeTo(units.map(u=>'u:'+u.key));
if(!r)throw new Error('no route to '+brand);
const round=p=>p.map(v=>+v.toFixed(2));
const legs=r.legs.map(l=>({f:l.f,pts:l.pts.map(round)}));
const end=legs[legs.length-1].pts.slice(-1)[0];
const u=units.slice().sort((a,b)=>Math.hypot(a.c[0]-end[0],a.c[1]-end[1])-Math.hypot(b.c[0]-end[0],b.c[1]-end[1]))[0];
const rides=r.legs.slice(1).map(l=>l.ride&&l.ride.conn&&l.ride.conn.id);
const out={about:`Route exported from the product's own router (engine.js routeTo) - kiosk at ${E.KIOSK.f} ${E.KIOSK.x},${E.KIOSK.y} to Bellagio (2F) via ${rides.join(' and ')}. Used by attract.py.`,
  legs,target:{brand,key:u.key,c:round(u.c),label:'BELLAGIO'},kiosk:{f:E.KIOSK.f,x:E.KIOSK.x,y:E.KIOSK.y}};
fs.writeFileSync(path.join(__dirname,'..','blender','attract_route.json'),JSON.stringify(out));
console.log(out.about);console.log('legs',legs.map(l=>l.f+':'+l.pts.length).join(' '),'target',u.key,u.c);
