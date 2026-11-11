// Loads web/js/data.js + web/js/engine.js into a sandbox (they are browser scripts, not modules).
const fs=require('fs'),path=require('path'),vm=require('vm');
module.exports=function load(query){
  const web=path.join(__dirname,'..','web','js');
  const src=fs.readFileSync(path.join(web,'data.js'),'utf8')+'\n'+fs.readFileSync(path.join(web,'engine.js'),'utf8');
  const ctx={module:{exports:{}},URLSearchParams,console};
  if(query)ctx.location={search:query};
  vm.createContext(ctx);vm.runInContext(src,ctx,{filename:'engine.js'});
  return ctx.module.exports;
};
