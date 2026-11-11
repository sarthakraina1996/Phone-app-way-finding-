// Writes blender/escalators.json: the escalators the app builds (engine.escalatorRuns): one per escalator, on the
// floor it leaves, and which way it rises, so the Blender film builds exactly the same ones. Run after changing
// the floor data:
//   node tests/export_escalators.js
const fs=require('fs'),path=require('path');
const E=require('./load-engine.js')();
const out={};
for(const f of E.FLOOR_ORDER){const r=E.escalatorRuns(f);if(r.length)out[f]=r.map(x=>({r:x.r,axis:x.axis,dir:x.dir,conn:x.conn}));}
const file=path.join(__dirname,'..','blender','escalators.json');
fs.writeFileSync(file,JSON.stringify(out));
console.log('escalators.json:',Object.entries(out).map(([f,r])=>f+' '+r.length).join(', '));
