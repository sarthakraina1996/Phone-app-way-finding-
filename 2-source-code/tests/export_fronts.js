// Writes blender/fronts.json: every shop's front as the app draws it (engine computeFronts + openSpan): the edge,
// its outward normal, the part of it that is open to the walkway and where the door is, so the Blender film puts
// glass, doors and signs in exactly the same places. Run after changing the floor data:
//   node tests/export_fronts.js
const fs=require('fs'),path=require('path');
const E=require('./load-engine.js')();
const out={};
for(const u of E.UNITS){const fr=u.front;if(!fr||!fr.span)continue;
  out[u.key]={a:fr.a,b:fr.b,n:fr.n.map(v=>+v.toFixed(4)),s0:+fr.span.s0.toFixed(2),s1:+fr.span.s1.toFixed(2),door:+fr.span.door.toFixed(2)};}
const file=path.join(__dirname,'..','blender','fronts.json');
fs.writeFileSync(file,JSON.stringify(out));
console.log('fronts.json:',Object.keys(out).length,'units');
