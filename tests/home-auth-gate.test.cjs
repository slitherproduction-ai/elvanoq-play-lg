const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const platforms=['lg'];const tick=()=>new Promise(r=>setImmediate(r));
async function run(name){
 let queue=[],sync=[];const EP={Stage:{show:(r,v)=>{if(r)r.visible=v},isVisible:r=>!!r.visible},Registry:{remove(){},writeJson(){}},LocalState:{},Parental:{},ListScope:{set(){},idFor(){return 'test'}},Portal:{manual:null,playlistSync:()=>new Promise(resolve=>sync.push(resolve)),portalPlaylist:()=>null,useManualPlaylist(p){this.manual=p;return p}},text:v=>String(v||'').trim(),CatalogService:{clearSearchCache(){},load:()=>new Promise((resolve,reject)=>queue.push({resolve,reject}))}};
 const ctx={window:{EP,localStorage:{getItem:()=>null}},Date,setTimeout,clearTimeout};vm.createContext(ctx);
 for(const f of ['mainScene.js','appShell.js'])vm.runInContext(fs.readFileSync(__dirname+'/../src/views/'+f,'utf8'),ctx);
 function setup(){queue=[];sync=[];EP.Portal.manual=null;const scene=Object.create(EP.MainScene.prototype),shell=Object.create(EP.AppShell.prototype);
 Object.assign(scene,{licenseState:'active',status:{},licenseTimer:{running:()=>false,start(){},stop(){}},expiredOverlay:{},expiredCode:{},expiredInfo:{},setLoading(){},setTone(){},setActivationVisible(v){this.activationVisible=v},showWelcomeBack(){},openKeyboard(opts){this.dialog={closed:false,close(){this.closed=true}};this.keyboard=opts},openProblem(opts){this.problem=opts},shell});
 Object.assign(shell,{app:scene,root:{visible:false},selectedIndex:0,views:[{}],epg:{configure(){}},stopPlayback(){},showSection(){},applyCatalogResult(){this.catalog=[];this.categories=[]},resetCategoryCache(){},refreshCurrent(){},tryDeepLink(){},catalog:[],categories:[]});return scene;}
 function login(s,user='user',pass='password'){s.askCredentials('test','http://provider.example');s.keyboard.onButton(0,user);if(user){s.dialog.closed=true;s.keyboard.onButton(0,pass);}}
 const data={channels:[],categories:[],epg:null};let s=setup();s.showActivationState('active');assert.equal(s.shell.root.visible,false);
 s=setup();login(s,'');assert.equal(queue.length,0);assert.equal(s.shell.root.visible,false);
 s=setup();login(s,'user','');assert.equal(queue.length,0);assert.equal(s.shell.root.visible,false);
 s=setup();login(s);assert.equal(queue.length,1);assert.equal(s.shell.root.visible,false);assert.equal(s.activationVisible,true);s.showActivationState('active');assert.equal(s.shell.root.visible,false);queue[0].reject(Error('auth refused'));await tick();assert.equal(s.shell.root.visible,false);assert.equal(s.activationVisible,true);
 s=setup();login(s);queue[0].resolve(data);await tick();assert.equal(s.shell.root.visible,true);assert.equal(s.activationVisible,false);
 s=setup();login(s);s.showActivationState('blocked');queue[0].resolve(data);await tick();assert.equal(s.shell.root.visible,false);assert.equal(s.activationVisible,true);
 s=setup();login(s);const first=queue[0];login(s,'other','different');first.resolve(data);await tick();assert.equal(s.shell.root.visible,false);queue[1].reject(Error('refused'));await tick();assert.equal(s.shell.root.visible,false);
 s=setup();s.shell.show(true);assert.equal(s.shell.root.visible,false);
 // Lista do Portal autentica automaticamente, sem pedir código/credenciais de novo.
 s=setup();s.requestPlaylistSync(false);assert.equal(sync.length,1);sync[0]({ok:true,body:{},playlist:{name:'Portal',origin:'portal-webos',sourceType:'m3u',url:'http://provider.example/list'}});await tick();assert.equal(queue.length,1);assert.equal(s.shell.root.visible,false);queue[0].resolve(data);await tick();assert.equal(s.shell.root.visible,true);
 // Cancelar em qualquer etapa retoma a lista vinculada, mesmo se já sincronizada.
 for(const step of ['code','user','password']){s=setup();s.playlistSynced=true;s.openServerCodeKeyboard();assert.equal(s.codeLoginActive,true);if(step==='user')s.askCredentials('test','http://provider.example');if(step==='password'){s.askCredentials('test','http://provider.example');s.keyboard.onButton(0,'user');}s.dialog.closed=true;s.keyboard.onButton(1,'');assert.equal(s.codeLoginActive,false);assert.equal(sync.length,1);sync[0]({ok:true,body:{},playlist:{name:'Portal',origin:'portal-webos'}});await tick();queue[0].resolve(data);await tick();assert.equal(s.shell.root.visible,true);}
 // Uma consulta em andamento ao cancelar também pode restaurar a lista.
 s=setup();s.requestPlaylistSync(false);s.openServerCodeKeyboard();s.dialog.closed=true;s.keyboard.onButton(1,'');assert.equal(sync.length,1);sync[0]({ok:true,body:{},playlist:{name:'Portal',origin:'portal-webos'}});await tick();queue[0].resolve(data);await tick();assert.equal(s.shell.root.visible,true);
 // Resposta durante digitação não abre Home; cancelar dispara nova sincronização.
 s=setup();s.requestPlaylistSync(false);s.openServerCodeKeyboard();sync[0]({ok:true,body:{},playlist:{name:'Portal',origin:'portal-webos'}});await tick();assert.equal(queue.length,0);s.dialog.closed=true;s.keyboard.onButton(1,'');assert.equal(sync.length,2);
 // Verificar ativação consulta novamente a lista, mesmo com flag antiga de sincronização.
 s=setup();s.playlistSynced=true;s.actionIndex=1;EP.Portal.identity={};EP.Portal.licenseStatus=()=>Promise.resolve({state:'active'});if(s.runAction){s.runAction();await tick();assert.equal(sync.length,1);}
 console.log(name+': regressões OK (licença, campos ausentes, autenticação pendente/recusada, sucesso, bloqueio, resposta antiga e abertura direta).');
}
(async()=>{for(const p of platforms)await run(p)})().catch(e=>{console.error(e);process.exitCode=1});
