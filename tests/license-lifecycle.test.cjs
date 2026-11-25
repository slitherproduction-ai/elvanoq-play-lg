const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 for(const name of ['lg']){
  const base=['lg','titan'].includes(name)?'src':'public/src';let calls=0,now=100000000,response;
  const EP={Config:{},lower:x=>String(x||'').toLowerCase(),text:x=>String(x||''),extend:Object.assign,PlaylistRules:{isHttpUrl:()=>true}};
  const fakeDate={now:()=>now,parse:Date.parse};const ctx={window:{EP,localStorage:{getItem:()=>null}},Date:fakeDate,Promise,Uint8Array};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,base,'services/portalService.js'),'utf8'),ctx);
  const p=EP.Portal;p.identity={deviceId:'id-one',key:'123456'};p.request=async()=>{calls++;return JSON.parse(JSON.stringify(response))};
  response={status:200,ok:true,body:{license:{can_play:true,status:'active'},code_access:{can_connect:true}}};assert.equal((await p.licenseStatus()).state,'active');const count=calls;
  for(let i=0;i<20;i++)assert.equal(await p.ensurePlayable(),true);assert.equal(calls,count);
  response={status:503,ok:false,body:{}};assert.equal((await p.licenseStatus()).state,'active');now+=86400001;assert.equal((await p.licenseStatus()).state,'offline');assert.equal(await p.ensurePlayable(),false);
  response={status:200,ok:true,body:{license:{can_play:true,status:'active'}}};await p.licenseStatus();response={status:403,ok:false,body:{}};assert.equal((await p.licenseStatus()).state,'blocked');response={status:503,ok:false,body:{}};assert.equal((await p.licenseStatus()).state,'offline');assert.equal(await p.ensurePlayable(),false);
  response={status:200,ok:true,body:{license:{can_play:true,status:'active'}}};await p.licenseStatus();p.identity={deviceId:'other',key:'654321'};assert.equal(await p.ensurePlayable(),false);
  const source=fs.readFileSync(path.join(root,base,'views/mainScene.js'),'utf8');assert(source.includes("this.licenseTimer.stop(); // No license polling"));assert(source.includes("!hidden && wasHidden"));assert(source.includes("self.licenseState !== 'active' && !self.shell.authenticated"));new vm.Script(source);
  console.log(name+': session playback without network, bounded offline grace, explicit denial, identity isolation, resume/pending polling OK');
 }
})().catch(e=>{console.error(e);process.exitCode=1});
