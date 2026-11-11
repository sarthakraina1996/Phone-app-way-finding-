// Writes blender/rails.json: the glass balustrades the app draws on the upper floors (engine.voidRails),
// so the Blender film shows exactly the same rails. Run after changing the floor data:
//   node tests/export_rails.js
const fs=require('fs'),path=require('path');
const E=require('./load-engine.js')();
const out={};
for(const f of E.FLOOR_ORDER){const r=E.voidRails(f);if(r.length)out[f]=r.map(x=>({a:x.a.map(v=>+v.toFixed(2)),b:x.b.map(v=>+v.toFixed(2)),n:x.n.map(v=>+v.toFixed(4))}));}
const file=path.join(__dirname,'..','blender','rails.json');
fs.writeFileSync(file,JSON.stringify(out));
console.log('rails.json:',Object.entries(out).map(([f,r])=>f+' '+r.length+' runs').join(', '));
