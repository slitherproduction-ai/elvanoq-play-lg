import {saveVisualPlaylist,matchesAndroidPlaylistKey,UNCLAIMED_PLAYLIST_KEY} from './visual-playlist.ts';
import {playlistConnection} from './playlist-connection.ts';
import {resolveRokuServerCode} from './roku-server-code.ts';
import {handleRoku} from './roku-api.ts';
import {resolveNativeServerCode} from './native-server-code.ts';
const base = Deno.env.get('SUPABASE_URL');
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const origins = new Set(['https://elvanoq-play-portal.slitherproduction.chatgpt.site','https://elvanoqplay.app','https://titan.elvanoqplay.app','http://terminal.local:4173']);
const apk = 'https://github.com/slitherproduction-ai/flixplay/releases/download/v2.17.15/ELVANOQ-v2.17.15-universal.apk';
class ApiError extends Error { constructor(public status:number, message:string) { super(message); } }
async function db(path:string, method='GET', body?:unknown, signal?:AbortSignal) {
 const r=await fetch(base+'/rest/v1/'+path,{method,headers:{apikey:service!,Authorization:'Bearer '+service,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body),signal});
 if(!r.ok) {
  const error=await r.json().catch(()=>({}));
  const known:Record<string,[number,string]>={SERVER_CODE_CAPACITY_REACHED:[409,"Este código atingiu o limite de dispositivos vinculados. Solicite uma vaga ao administrador."],INVALID_DEVICE_LIMIT:[400,"Informe um limite inteiro entre 1 e 1.000.000 dispositivos."],ROKU_INVALID:[400,'Confira os dados do dispositivo Roku.'],ROKU_IDENTITY:[403,'Código ou chave Roku inválidos, ou dispositivo indisponível.'],ROKU_CONFLICT:[409,'Identidade Roku já vinculada. Confira o código e a chave na TV.'],ROKU_FORBIDDEN:[403,'Sua conta não pode executar esta ação no dispositivo Roku.'],ROKU_NOT_FOUND:[404,'Dispositivo Roku não encontrado.'],HOST_IN_USE:[409,'Este Host/DNS já está associado a outro código.'],HOST_AMBIGUOUS:[409,'Host/DNS associado a mais de um código. Solicite a revisão ao administrador.'],INVALID_CODE_DEVICE:[400,'Identificação do dispositivo inválida.'],SERVER_CODE_UNAVAILABLE:[404,'Código de servidor não encontrado ou desativado.'],DEVICE_BINDING_REQUIRED:[409,'O MAC já está cadastrado com outra chave. Confirme o vínculo do aplicativo com o portal.'],DEVICE_ASSIGN_FORBIDDEN:[403,'Somente o administrador atribui dispositivos.'],RESELLER_UNAVAILABLE:[400,'Parceiro indisponível.'],PLAYLIST_KEY_REQUIRED:[403,'Este MAC já está cadastrado. Informe a chave ou entre como administrador/parceiro responsável para alterar a lista.'],PLAYLIST_FORBIDDEN:[403,'Conta sem permissão para cadastrar ou alterar listas.'],PLAYLIST_DEVICE_DISABLED:[403,'Este dispositivo está desativado. Solicite a reativação ao responsável.'],INVALID_PLAYLIST:[400,'Confira os dados da lista.'],SERVER_CODE_FORBIDDEN:[403,'Somente o administrador gerencia códigos de servidor.'],INVALID_SERVER_CODE:[400,'Confira o código e o endereço do servidor.'],DEVICE_FORBIDDEN:[403,'Sua conta não pode remover ou restaurar este dispositivo.'],ADMIN_REQUIRED:[403,'Operação exclusiva do administrador.'],INVALID_LIFETIME:[400,'Informe um motivo entre 5 e 500 caracteres.'],INVALID_PAYMENT:[400,'Referência ou valor do pagamento inválidos.'],PAYMENT_REFERENCE_CONFLICT:[409,'Esta referência já foi usada em outro pagamento.'],DEVICE_NOT_FOUND:[404,'Dispositivo não encontrado.'],DEVICE_NOT_ACTIVE:[403,'Dispositivo indisponível ou desativado.']};
  const match=known[error.message];if(match)throw new ApiError(...match);
  throw new ApiError(r.status===409?409:500,r.status===409?'Este registro já existe.':'Não foi possível concluir a operação.');
 }
 return r.status===204?null:r.json();
}
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(b=>b.toString(16).padStart(2,'0')).join('');
function macOf(s:unknown) { const mac=String(s||'').replace(/[^0-9a-f]/gi,'').toUpperCase(); if(!/^[0-9A-F]{12}$/.test(mac))throw new ApiError(400,'Informe um MAC válido.'); return mac.match(/.{2}/g)!.join(':'); }
function webosId(s:unknown) { const value=String(s||'').trim().toLowerCase(); if(!/^[a-f0-9]{64}$/.test(value))throw new ApiError(400,'Identificação webOS inválida.'); return value; }
function text(s:unknown,max=100){ const value=String(s||'').trim();if(!value||value.length>max)throw new ApiError(400,'Confira os campos informados.');return value; }
function http(s:unknown){const value=text(s,4096);let u;try{u=new URL(value);}catch{throw new ApiError(400,'Informe uma URL válida.');}if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw new ApiError(400,'Use um endereço HTTP ou HTTPS sem credenciais no host.');return value;}
function serverCode(v:unknown){const code=text(v,32).toLowerCase();if(!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(code))throw new ApiError(400,'Use um código de 3 a 32 caracteres: letras, números, hífen ou sublinhado.');return code;}
function serverHost(v:unknown){let u;try{u=new URL(text(v,2048));}catch{throw new ApiError(400,'Informe o Host/DNS completo, com http:// ou https://.');}if(!['http:','https:'].includes(u.protocol)||!u.hostname||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw new ApiError(400,'Use somente o Host/DNS e a porta, sem usuário, senha, caminho ou parâmetros.');return u.origin;}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(origins.has(origin)?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
 const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...headers,...(status===429?{'Retry-After':'900'}:{})}});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 try{
  if(origin&&!origins.has(origin))throw new ApiError(403,'Origem não autorizada.');
  if(req.method!=='POST')throw new ApiError(405,'Método não permitido.');
  const raw=await req.text();if(raw.length>16384)throw new ApiError(413,'Dados muito extensos.');
  let b;try{b=JSON.parse(raw);}catch{throw new ApiError(400,'Solicitação inválida.');}
  if(!b||typeof b!=='object'||Array.isArray(b))throw new ApiError(400,'Solicitação inválida.');
  const action=b.action;
  if(action==='platform-capabilities')return reply({titan:true});
  if(action==='security-config')return reply({turnstile_enabled:Deno.env.get('TURNSTILE_ENABLED')==='true',site_key:Deno.env.get('TURNSTILE_SITE_KEY')||null});
  if(['code-device-register','device-status','playlist-sync','license-status','license-activate','server-code-resolve','playlist','webos-device-register','webos-license-status','webos-playlist-sync'].includes(action)){
   const isWebos=action==='webos-device-register'||action==='webos-license-status'||action==='webos-playlist-sync';
   const subject=isWebos?'webos:'+webosId(b.device_id):(b.mac?macOf(b.mac):'code:'+serverCode(b.code));
   const allowed=await db('rpc/portal_rate_limit','POST',{p_bucket:await hash('device-access:'+subject),p_limit:isWebos||b.mac?60:300,p_seconds:isWebos||b.mac?900:60});
   if(allowed!==true)throw new ApiError(429,'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.');
  }
  if(['playlist','webos-playlist','roku-playlist'].includes(action)&&Deno.env.get('TURNSTILE_ENABLED')==='true'){
   const secret=Deno.env.get('TURNSTILE_SECRET_KEY');if(!secret)throw new ApiError(503,'Verificação de segurança indisponível.');
   const token=typeof b.captcha_token==='string'?b.captcha_token:'';if(!token||token.length>2048)throw new ApiError(403,'Conclua a verificação de segurança.');
   let verification;try{const r=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret,response:token}),signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error();verification=await r.json();}catch{throw new ApiError(503,'Não foi possível verificar o CAPTCHA. Tente novamente.');}
   if(verification.success!==true||!['elvanoq-play-portal.slitherproduction.chatgpt.site','elvanoqplay.app'].includes(verification.hostname)||verification.action!=='playlist')throw new ApiError(403,'Verificação de segurança inválida ou expirada. Tente novamente.');
  }

  if(['playlist','webos-playlist','roku-playlist'].includes(action)&&!String(b.device_key??b.deviceKey??'').trim())return reply(await saveVisualPlaylist(b,{db,hash,ApiError,macOf,http,text}));
  if(action==='roku-server-code-resolve')return reply(await resolveRokuServerCode(b,{db,hash,ApiError}));
  if(typeof action==='string'&&action.startsWith('roku-'))return reply(await handleRoku(req,b,{db,hash,ApiError,base,service,text,http}));
  if(['webos-device-register','webos-license-status','webos-playlist-sync'].includes(action)){
   const identity=webosId(b.device_id),nativeKey=text(b.device_key,128);
   if(nativeKey.length<6)throw new ApiError(400,'Identificação do aplicativo inválida.');
   await db('rpc/portal_native_binding_claim','POST',{p_platform:'webos',p_identity:identity,p_key_hash:await hash(nativeKey),p_device_code:null});
  }
  if(action==='webos-playlist'){
   const code=String(b.tv_code||'').trim().toUpperCase(),key=text(b.device_key,128);
   if(!/^(LG|SM|IOS|TT)-[0-9A-F]{12}$/.test(code)||!/^\d{6,128}$/.test(key))throw new ApiError(400,'Informe o código da TV (LG-… ou SM-…) e a chave numérica exibidos na tela.');
   const allowed=await db('rpc/portal_rate_limit','POST',{p_bucket:await hash('webos-playlist:'+code),p_limit:30,p_seconds:900});if(allowed!==true)throw new ApiError(429,'Muitas tentativas. Aguarde alguns minutos.');
   const links=await db('portal_webos_devices?lgudid_hash=like.'+code.split('-')[1].toLowerCase()+'*&platform=eq.'+(code.startsWith('TT-')?'titan':code.startsWith('IOS-')?'ios-msx':code.startsWith('SM-')?'samsung-msx':'webos')+'&select=managed_device_id,device_key_hash');
   if(links.length!==1||links[0].device_key_hash!==await hash(key))throw new ApiError(403,'Código da TV ou chave inválidos. Abra o aplicativo na TV e confira os dados.');
   const rows=await db('portal_managed_devices?id=eq.'+links[0].managed_device_id+'&select=id,mac,key_hash,active');const device=rows[0];
   if(!device||device.key_hash!==await hash(key)||!device.active)throw new ApiError(403,'TV indisponível ou desativada. Procure o responsável.');
   const requestedKind=b.kind;if(!['m3u','xtream'].includes(requestedKind))throw new ApiError(400,'Tipo de lista inválido.');
   const {kind,credentials}=playlistConnection(requestedKind,requestedKind==='m3u'?{url:http(b.url)}:{host:http(b.host),username:text(b.username,256),password:text(b.password,1024)});
   const result=await db('rpc/portal_playlist_register_host','POST',{p_mac:device.mac,p_key_hash:await hash(key),p_supplied_key:true,p_name:text(b.name),p_kind:kind,p_credentials:credentials,p_origin:new URL(kind==='m3u'?credentials.url:credentials.host).origin,p_actor:null});
   return reply({playlist_kind:kind,converted_to_xtream:requestedKind==='m3u'&&kind==='xtream',message:'Lista salva para a TV. Abra o aplicativo na TV e sincronize sua lista.',tv_code:code,sync_available:true,host_match:result.host_match,server_code:result.server_code,license:result.license,code_access:result.code_access});
  }
  if(action==='webos-playlist-sync'){
   const id=webosId(b.device_id),key=text(b.device_key,128);
   const links=await db('portal_webos_devices?lgudid_hash=eq.'+id+'&select=managed_device_id,device_key_hash');
   if(links.length!==1||links[0].device_key_hash!==await hash(key))throw new ApiError(403,'Identificação ou chave inválidas.');
   const rows=await db('portal_managed_devices?id=eq.'+links[0].managed_device_id+'&select=id,mac,key_hash,active,display_name,server_code');const device=rows[0];
   if(!device||device.key_hash!==await hash(key))throw new ApiError(403,'Identificação ou chave inválidas.');
   if(!device.active)return reply({registered:true,active:false,playlist:null,license:{can_play:false,status:'inactive'}});
   const license=await db('rpc/portal_effective_license','POST',{p_mac:device.mac});
   const codeAccess=device.server_code?await db('rpc/portal_code_access','POST',{p_mac:device.mac,p_code:device.server_code}):null;
   const canPlay=license.can_play===true&&(!codeAccess||codeAccess.can_connect===true);
   const lists=canPlay?await db('portal_playlists?device_id=eq.'+device.id+'&select=name,kind,credentials,updated_at'):[];
   return reply({registered:true,active:true,display_name:device.display_name,server_code:device.server_code,license:{...license,can_play:canPlay},code_access:codeAccess,playlist:lists[0]||null});
  }
  // Portal checkout uses only the visual prefix plus key; the full digest stays server-side.
  if(action==='webos-checkout'){
   const code=String(b.tv_code||'').trim().toUpperCase(),key=text(b.device_key,128);
   if(!/^(LG|SM|IOS|TT)-[0-9A-F]{12}$/.test(code)||!/^\d{6,128}$/.test(key))throw new ApiError(400,'Informe o código da TV (LG-… ou SM-…) e a chave numérica exibidos na tela.');
   if(!['validate','create','status'].includes(b.operation))throw new ApiError(400,'Operação inválida.');
   const quota=await db('rpc/portal_rate_limit','POST',{p_bucket:await hash('webos-checkout:'+b.operation+':'+code),p_limit:b.operation==='status'?180:30,p_seconds:900});
   if(quota!==true)throw new ApiError(429,'Muitas tentativas. Aguarde alguns minutos.');
   const links=await db('portal_webos_devices?lgudid_hash=like.'+code.split('-')[1].toLowerCase()+'*&platform=eq.'+(code.startsWith('TT-')?'titan':code.startsWith('IOS-')?'ios-msx':code.startsWith('SM-')?'samsung-msx':'webos')+'&select=managed_device_id,device_key_hash');
   // Reject ambiguous prefixes rather than risk charging the wrong TV.
   if(links.length!==1||links[0].device_key_hash!==await hash(key))throw new ApiError(403,'Código da TV ou chave inválidos. Abra o aplicativo na TV e confira os dados.');
   const rows=await db('portal_managed_devices?id=eq.'+links[0].managed_device_id+'&select=id,mac,key_hash,active');const device=rows[0];
   if(!device||device.key_hash!==await hash(key)||!device.active)throw new ApiError(403,'TV indisponível ou desativada. Procure o responsável.');
   if(b.operation==='validate'){const license=await db('rpc/portal_effective_license','POST',{p_mac:device.mac});return reply({validated:true,tv_code:code,license});}
   // The existing payment service retains all amount, consent, idempotency and webhook checks.
   const response=await fetch(base+'/functions/v1/paghiper-payments',{method:'POST',headers:{apikey:service!,'Content-Type':'application/json'},body:JSON.stringify({action:b.operation,mac:device.mac,payment_access:b.payment_access,order_id:b.order_id,payer_name:b.payer_name,payer_email:b.payer_email,payer_cpf_cnpj:b.payer_cpf_cnpj,consent:b.consent}),signal:AbortSignal.timeout(30000)});
   const result=await response.json();if(result.order){delete result.order.mac;result.order.tv_code=code;}return reply(result,response.status);
  }
  if(action==='code-device-register'){
   const mac=macOf(b.mac),key=text(b.device_key,128),code=serverCode(b.code);
   if(key.length<6)throw new ApiError(400,'Informe a chave de identificação do aplicativo.');
   const result=await db('rpc/portal_code_device_register','POST',{p_mac:mac,p_key_hash:await hash(key),p_code:code,p_name:typeof b.name==='string'&&b.name.trim()?text(b.name,100):'Dispositivo '+mac,p_platform:typeof b.platform==='string'?b.platform.slice(0,32):'',p_version:typeof b.app_version==='string'?b.app_version.slice(0,32):''});
   return reply(result);
  }
  if(action==='server-code-resolve'){
   if(['samsung-msx','lg-msx','ios-msx','webos','titan'].includes(b.platform) && b.device_id)return reply(await resolveNativeServerCode(b,{db,hash,ApiError,webosId,text,serverCode,serverHost}));
   const code=serverCode(b.code);const rows=await db('portal_server_codes?code=eq.'+encodeURIComponent(code)+'&select=code,host,updated_at,validity,expires_at,active,revoked');
   if(!rows[0])throw new ApiError(404,'Código de servidor não encontrado.');
   let mac=null;
   if(b.mac||b.device_key){mac=macOf(b.mac);const key=text(b.device_key,128);const devices=await db('portal_managed_devices?mac=eq.'+encodeURIComponent(mac)+'&select=key_hash');if(!devices[0]||!await matchesAndroidPlaylistKey(devices[0],mac,key,{db,hash}))throw new ApiError(403,'MAC ou chave inválidos.');}
   const access=await db('rpc/portal_code_access','POST',{p_mac:mac,p_code:code});
   if(!access.can_connect)return reply({message:access.reason==='device_suspended'?'Dispositivo suspenso. Procure o responsável.':'Código sem acesso. Ative uma licença individual para este dispositivo.',code_access:access,payment:access.payment_required?{checkout_url:'https://elvanoq-play-portal.slitherproduction.chatgpt.site/ativacao/',amount_cents:2490,mac}:null},403);
   const license=mac?await db('rpc/portal_effective_license','POST',{p_mac:mac}):null;
   const server=rows[0];return reply({server:{code:server.code,host:server.host,updated_at:server.updated_at},code_access:access,...(license?{license}:{})});
  }
  // LG and Samsung/MSX send only a SHA-256 identity. It is never parsed as a MAC.
  if(action==='webos-device-register'){
   const id=webosId(b.device_id),key=text(b.device_key,128);
   if(key.length<6)throw new ApiError(400,'Informe a chave de identificação do aplicativo.');
   const platform=b.platform==='titan'?'titan':b.platform==='ios-msx'?'ios-msx':b.platform==='samsung-msx'?'samsung-msx':'webos';
   const result=platform==='titan'?await db('rpc/portal_titan_device_register','POST',{p_lgudid_hash:id,p_key_hash:await hash(key),p_app_version:typeof b.app_version==='string'?b.app_version.slice(0,32):null}):await db('rpc/portal_webos_device_register','POST',{p_lgudid_hash:id,p_key_hash:await hash(key),p_app_version:typeof b.app_version==='string'?b.app_version.slice(0,32):null,p_platform:platform});
   return reply(result);
  }
  if(action==='webos-license-status'){
   const id=webosId(b.device_id),key=text(b.device_key,128);
   const links=await db('portal_webos_devices?lgudid_hash=eq.'+encodeURIComponent(id)+'&select=managed_device_id,device_key_hash');
   const link=links[0];
   if(!link||link.device_key_hash!==await hash(key))throw new ApiError(403,'Identificação ou chave inválidas.');
   const devices=await db('portal_managed_devices?id=eq.'+link.managed_device_id+'&select=id,mac,key_hash,server_code,active');
   const device=devices[0];
   if(!device||device.key_hash!==await hash(key))throw new ApiError(403,'Identificação ou chave inválidas.');
   await db('portal_webos_devices?managed_device_id=eq.'+link.managed_device_id,'PATCH',{last_seen_at:new Date().toISOString()});
   await db('portal_managed_devices?id=eq.'+link.managed_device_id,'PATCH',{last_seen_at:new Date().toISOString(),app_version:typeof b.app_version==='string'?b.app_version.slice(0,32):undefined});
   if(device.active!==true)return reply({license:{can_play:false,status:'inactive'},message:'Esta TV está desativada.'},403);
   let license=await db('rpc/'+(device.server_code?'portal_effective_license':'portal_license_status'),'POST',{p_mac:device.mac});
   if(device.server_code){
    const access=await db('rpc/portal_code_access','POST',{p_mac:device.mac,p_code:device.server_code});
    if(!access.can_connect)license={...license,can_play:false,payment_required:access.payment_required,code_blocked:true};
    return reply({license,code_access:access});
   }
   return reply({license});
  }
  // This lookup is intentionally separate from the licensing flow. It lets
  // the ELVANOQ app confirm that its installation identifier was registered
  // in the Portal, without activating a trial, creating a payment or changing
  // a device record.
  if(action==='device-status'){
   const mac=macOf(b.mac),key=text(b.device_key,128);
   const rows=await db('portal_managed_devices?mac=eq.'+encodeURIComponent(mac)+'&select=key_hash,active,display_name');
   const device=rows[0];
   if(!device)return reply({registered:false});
   if(!await matchesAndroidPlaylistKey(device,mac,key,{db,hash}))throw new ApiError(403,'MAC ou chave inválidos.');
   return reply({registered:true,active:device.active===true,display_name:device.display_name});
  }
  // The app may fetch only the playlist bound to its own device. A MAC by
  // itself is never sufficient: the stored hash must match the supplied key.
  if(action==='playlist-sync'){
   const mac=macOf(b.mac),key=text(b.device_key,128);
   const rows=await db('portal_managed_devices?mac=eq.'+encodeURIComponent(mac)+'&select=id,key_hash,active,display_name,server_code');
   const device=rows[0];
   if(!device)return reply({registered:false});
   if(!await matchesAndroidPlaylistKey(device,mac,key,{db,hash}))throw new ApiError(403,'MAC ou chave inválidos.');
   if(device.active!==true)return reply({registered:true,active:false,display_name:device.display_name});
   const playlists=await db('portal_playlists?device_id=eq.'+device.id+'&select=name,kind,credentials,updated_at');
   const playlist=playlists[0]||null;
   const license=await db('rpc/portal_effective_license','POST',{p_mac:mac});
   const codeAccess=device.server_code?await db('rpc/portal_code_access','POST',{p_mac:mac,p_code:device.server_code}):null;
   return reply({registered:true,active:true,display_name:device.display_name,server_code:device.server_code,license,code_access:codeAccess,playlist:codeAccess&&!codeAccess.can_connect?null:playlist});
  }
  if(action==='license-status'||action==='license-activate'){
   const mac=macOf(b.mac),key=text(b.device_key,128);
   const devices=await db('portal_managed_devices?mac=eq.'+encodeURIComponent(mac)+'&select=id,key_hash,server_code');
   if(!devices[0]||!await matchesAndroidPlaylistKey(devices[0],mac,key,{db,hash}))throw new ApiError(403,'MAC ou chave inválidos.');
   let license=await db('rpc/'+(devices[0].server_code?'portal_effective_license':action==='license-activate'?'portal_license_activate':'portal_license_status'),'POST',{p_mac:mac});
   if(devices[0].server_code){const access=await db('rpc/portal_code_access','POST',{p_mac:mac,p_code:devices[0].server_code});if(!access.can_connect)license={...license,can_play:false,payment_required:access.payment_required,code_blocked:true};return reply({license,code_access:access});}
   return reply({license});
  }
  if(action==='playlist'){
   const mac=macOf(b.mac),supplied=typeof b.device_key==='string'?b.device_key.trim():'';
   if(supplied.length>128)throw new ApiError(400,'Chave inválida.');
   const requestedKind=b.kind;if(!['m3u','xtream'].includes(requestedKind))throw new ApiError(400,'Tipo de lista inválido.');
   const {kind,credentials}=playlistConnection(requestedKind,requestedKind==='m3u'?{url:http(b.url)}:{host:http(b.host),username:text(b.username,256),password:text(b.password,1024)});
   let actor=null;const bearer=req.headers.get('authorization');
   if(bearer?.startsWith('Bearer ')){
    const r=await fetch(base+'/auth/v1/user',{headers:{apikey:service!,Authorization:bearer}});
    if(!r.ok)throw new ApiError(401,'Sessão expirada. Entre novamente.');actor=(await r.json()).id;
   }
   if(actor){const access=await db('portal_staff?user_id=eq.'+actor+'&select=must_change_password');if(access[0]?.must_change_password)throw new ApiError(403,'Troque a senha inicial em Minha conta antes de gerenciar listas.');}
   const result=await db('rpc/portal_playlist_register_host','POST',{p_mac:mac,p_key_hash:await hash(supplied),p_supplied_key:!!supplied,p_name:text(b.name),p_kind:kind,p_credentials:credentials,p_origin:new URL(kind==='m3u'?credentials.url:credentials.host).origin,p_actor:actor});
   const licensing=result.host_match==='matched'?(result.license?.can_play?' Acesso liberado pela validade do código '+result.server_code+'.':' O Host foi reconhecido, mas o código está sem acesso; consulte a renovação individual ou o responsável.'):' Host sem código cadastrado. Aplica-se a licença individual deste dispositivo.';
   return reply({playlist_kind:kind,converted_to_xtream:requestedKind==='m3u'&&kind==='xtream',message:(result.created?'Dispositivo cadastrado e lista salva no portal.':'Lista atualizada no portal.')+licensing,created:result.created,sync_available:true,host_match:result.host_match,server_code:result.server_code,license:result.license,code_access:result.code_access});
  }
  const bearer=req.headers.get('authorization');if(!bearer?.startsWith('Bearer '))throw new ApiError(401,'Entre para continuar.');
  const userResponse=await fetch(base+'/auth/v1/user',{headers:{apikey:service!,Authorization:bearer}});
  if(!userResponse.ok)throw new ApiError(401,'Sessão expirada. Entre novamente.');
  const user=await userResponse.json();const roles=await db('portal_staff?user_id=eq.'+user.id+'&select=role,active,display_name,must_change_password');
  const role=roles[0];if(!role?.active)throw new ApiError(403,'Acesso exclusivo para revendedores autorizados e administrador.');
  const admin=role.role==='admin';
  if(role.must_change_password&&!['overview','account-update'].includes(action))throw new ApiError(403,'Troque a senha inicial em Minha conta antes de gerenciar o painel.');
  async function adminDeviceMac(payload:any){if(!payload.id)return macOf(payload.mac);const id=text(payload.id,36);if(!/^[0-9a-f-]{36}$/i.test(id))throw new ApiError(400,'Dispositivo inválido.');const rows=await db('portal_managed_devices?id=eq.'+id+'&select=mac');if(!rows[0])throw new ApiError(404,'Dispositivo não encontrado.');return rows[0].mac;}
  if(action==='device-rebind'){
   if(!admin)throw new ApiError(403,'Somente o administrador redefine vínculos.');
   const id=text(b.id,36),reason=text(b.reason,500),key=b.device_key===undefined?null:text(b.device_key,128);
   if(!/^[0-9a-f-]{36}$/i.test(id)||reason.length<5||(key!==null&&key.length<6))throw new ApiError(400,'Informe um motivo de 5 a 500 caracteres.');
   if(key!==null){const webos=await db('portal_webos_devices?managed_device_id=eq.'+id+'&select=managed_device_id');if(webos.length&&!/^\d{6,128}$/.test(key))throw new ApiError(400,'A chave da TV deve ser numérica.');}
   await db('rpc/portal_device_rebind_platform','POST',{p_id:id,p_actor:user.id,p_key_hash:key===null?UNCLAIMED_PLAYLIST_KEY:await hash(key),p_reason:reason,p_restore:b.restore===true});
   return reply({message:key===null?'Vínculo redefinido. Abra o aplicativo para concluir a sincronização; licença e pagamentos preservados.':'Vínculo redefinido. Licença e pagamentos preservados.'});
  }
  if(action==='device-assign'){
   if(!admin)throw new ApiError(403,'Somente o administrador atribui dispositivos.');
   const id=text(b.id,36),reseller=b.reseller_id===null?null:text(b.reseller_id,36);
   if(!/^[0-9a-f-]{36}$/i.test(id)||(reseller&&!/^[0-9a-f-]{36}$/i.test(reseller)))throw new ApiError(400,'Identificação inválida.');
   await db('rpc/portal_device_assign','POST',{p_id:id,p_reseller:reseller,p_actor:user.id});return reply({message:'Responsável pelo dispositivo atualizado.'});
  }
  if(action==='server-host-save'){
   if(!admin)throw new ApiError(403,'Somente o administrador gerencia os Hosts/DNS autorizados.');
   await db('rpc/portal_server_alias_save','POST',{p_code:serverCode(b.code),p_origin:serverHost(b.host),p_actor:user.id,p_remove:b.remove===true});
   return reply({message:b.remove===true?'Endereço alternativo removido.':'Endereço alternativo autorizado.'});
  }
  if(action==='server-code-save'){
   if(!admin)throw new ApiError(403,'Somente o administrador gerencia códigos de servidor.');
   if(typeof b.active!=='boolean')throw new ApiError(400,'Informe se o código está ativo.');
   const updateLimit=Object.hasOwn(b,'device_limit');
   if(updateLimit&&b.device_limit!==null&&(!Number.isInteger(b.device_limit)||b.device_limit<1||b.device_limit>1000000))throw new ApiError(400,'Informe um limite inteiro entre 1 e 1.000.000 dispositivos.');
   const server=await db('rpc/portal_server_code_save_capacity','POST',{p_code:serverCode(b.code),p_host:serverHost(b.host),p_active:b.active,p_actor:user.id,p_validity:b.validity||'lifetime',p_revoked:b.revoked===true,p_renew:b.renew===true,p_device_limit:updateLimit?b.device_limit:null,p_update_limit:updateLimit});
   return reply({message:'Código de servidor salvo.',server});
  }
  if(action==='account-update'){
   const name=text(b.name,100),email=text(b.email,254).toLowerCase(),password=typeof b.new_password==='string'?b.new_password:'';
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new ApiError(400,'Informe um e-mail válido.');
   if(password&&(password.length<12||password.length>128))throw new ApiError(400,'A nova senha precisa ter entre 12 e 128 caracteres.');
   if(role.must_change_password&&!password)throw new ApiError(400,'Defina uma nova senha para concluir o primeiro acesso.');
   let auth=null,pending=false;
   if(password||email!==user.email?.toLowerCase()){
    const current=text(b.current_password,128);
    if(password&&password===current)throw new ApiError(400,'Escolha uma senha diferente da senha atual.');
    const verified=await fetch(base+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:service!,'Content-Type':'application/json'},body:JSON.stringify({email:user.email,password:current})});
    if(!verified.ok)throw new ApiError(403,'A senha atual não confere.');
    auth=await verified.json();if(auth.user?.id!==user.id)throw new ApiError(403,'Não foi possível confirmar sua identidade.');
    const change:any={};if(password){change.password=password;change.current_password=current;}if(email!==user.email?.toLowerCase())change.email=email;
    const updated=await fetch(base+'/auth/v1/user',{method:'PUT',headers:{apikey:service!,Authorization:'Bearer '+auth.access_token,'Content-Type':'application/json'},body:JSON.stringify(change)});
    if(!updated.ok)throw new ApiError(400,'Não foi possível atualizar o acesso. Confira a senha, o e-mail e eventuais confirmações de segurança.');
    const result=await updated.json();pending=!!change.email&&result.email?.toLowerCase()!==email;
   }
   await db('portal_staff?user_id=eq.'+user.id,'PATCH',{display_name:name,...(password?{must_change_password:false}:{})});
   return reply({message:pending?'Nome e acesso atualizados. Confirme a alteração de e-mail pelas mensagens enviadas pelo serviço de autenticação.':'Conta atualizada.',email_pending:pending,...(auth?{session:{access_token:auth.access_token,refresh_token:auth.refresh_token,expires_in:auth.expires_in}}:{})});
  }
  if(action==='device-remove'||action==='device-restore'){
   const id=text(b.id,36);if(!/^[0-9a-f-]{36}$/i.test(id))throw new ApiError(400,'Dispositivo inválido.');
   await db('rpc/portal_device_archive','POST',{p_id:id,p_actor:user.id,p_remove:action==='device-remove'});
   return reply({message:action==='device-remove'?'Dispositivo excluído definitivamente. Cadastro, chave, lista, licença, pagamentos e histórico apagados.':'Dispositivo restaurado.'});
  }
  if(action==='overview'){
   if(role.must_change_password)return reply({role:role.role,email:user.email,name:role.display_name,must_change_password:true,devices:[],playlists:[],staff:[]});
   const devices=await db('portal_managed_devices?select=id,mac,display_name,reseller_id,active,expires_at,created_at,archived_at,server_code,first_code_login_at,last_seen_at,platform,app_version'+(admin?'':'&reseller_id=eq.'+user.id)+(b.include_removed===true?'':'&archived_at=is.null')+'&order=created_at.desc');
   await Promise.all(devices.map(async(d:any)=>{d.license=await db('rpc/portal_effective_license','POST',{p_mac:d.mac});if(d.server_code){d.code_access=await db('rpc/portal_code_access','POST',{p_mac:d.mac,p_code:d.server_code});if(!d.code_access.can_connect)d.license={...d.license,can_play:false,payment_required:d.code_access.payment_required,code_blocked:true};}}));
   const ids=devices.map((d:any)=>d.id);const lists=ids.length?await db('portal_playlists?select=device_id,name,kind,updated_at&device_id=in.('+ids.join(',')+')'):[];
   const staff=admin?await db('portal_staff?select=user_id,role,active,created_at,display_name,must_change_password'):[];
   let emails:any={};if(admin){let page=1;while(page<=20){const r=await fetch(base+'/auth/v1/admin/users?page='+page+'&per_page=100',{headers:{apikey:service!,Authorization:'Bearer '+service}});if(!r.ok)throw new ApiError(500,'Não foi possível consultar revendedores.');const u=await r.json();for(const v of u.users||[])emails[v.id]=v.email;if((u.users||[]).length<100)break;page++;}}
   const audit=admin?await db('portal_license_audit?select=id,mac,actor,action,reason,created_at&order=created_at.desc&limit=100'):[];
   const pixOrders=admin?await db('portal_pix_orders?select=id,mac,amount_cents,status,created_at,applied_at,license_until,review_required&order=created_at.desc&limit=100'):[];
   const serverCodes=admin?await db('portal_server_codes?select=code,host,active,created_at,updated_at,validity,expires_at,revoked,device_limit&order=code.asc'):[];
   if(admin){const usage=await db('portal_server_code_usage?select=code,device_count');const counts=new Map(usage.map((u:any)=>[u.code,u.device_count]));for(const c of serverCodes)c.device_count=counts.get(c.code)??0;}
   const serverHosts=admin?await db('portal_server_hosts?select=origin,code&order=origin.asc'):[];
   const webosLinks=ids.length?await db('portal_webos_devices?managed_device_id=in.('+ids.join(',')+')&select=managed_device_id,lgudid_hash,platform'):[];
   const visualByMac=new Map();for(const link of webosLinks){const d=devices.find((v:any)=>v.id===link.managed_device_id);if(d){const titan=link.platform==='titan',samsung=link.platform==='samsung-msx',ios=link.platform==='ios-msx';const visual=(titan?'TT-':ios?'IOS-':samsung?'SM-':'LG-')+link.lgudid_hash.slice(0,12).toUpperCase();visualByMac.set(d.mac,visual);d.visual_code=visual;d.platform=titan?'titan':ios?'ios':samsung?'samsung':'webos';delete d.mac;}}
   for(const record of [...audit,...pixOrders])if(visualByMac.has(record.mac)){record.visual_code=visualByMac.get(record.mac);delete record.mac;}
   const rokuDevices=await db('portal_roku_devices?select=id,device_code,platform,display_name,reseller_id,active,bound_at,trial_started_at,created_at,last_seen_at,server_code'+(admin?'':'&reseller_id=eq.'+user.id)+'&order=created_at.desc');
   if(rokuDevices.length)lists.push(...await db('portal_roku_playlists?select=device_id,name,kind,updated_at&device_id=in.('+rokuDevices.map((d:any)=>d.id).join(',')+')'));
   for(const device of rokuDevices){device.visual_code=device.device_code;delete device.device_code;device.license=await db('rpc/portal_roku_license','POST',{p_id:device.id});devices.push(device);}
   return reply({server_hosts:serverHosts,server_codes:serverCodes,pix_orders:pixOrders,audit:audit.map((a:any)=>({...a,actor_email:emails[a.actor]||a.actor})),role:role.role,email:user.email,name:role.display_name,must_change_password:false,devices,playlists:lists,staff:staff.map((s:any)=>({...s,email:emails[s.user_id]||s.user_id})),apk});
  }
  if(action==='webos-device-bind'){
   const code=String(b.tv_code||'').trim().toUpperCase(),key=text(b.device_key,128);
   if(!/^(LG|SM|IOS|TT)-[0-9A-F]{12}$/.test(code)||!/^\d{6,128}$/.test(key))throw new ApiError(400,'Informe o código e a chave numérica exibidos na TV.');
   const allowed=await db('rpc/portal_rate_limit','POST',{p_bucket:await hash('native-staff-bind:'+user.id),p_limit:40,p_seconds:900});
   if(allowed!==true)throw new ApiError(429,'Muitas tentativas. Aguarde alguns minutos.');
   const links=await db('portal_webos_devices?lgudid_hash=like.'+code.split('-')[1].toLowerCase()+'*&platform=eq.'+(code.startsWith('TT-')?'titan':code.startsWith('IOS-')?'ios-msx':code.startsWith('SM-')?'samsung-msx':'webos')+'&select=managed_device_id,device_key_hash');
   const digest=await hash(key);
   if(links.length!==1||links[0].device_key_hash!==digest)throw new ApiError(403,'Código ou chave inválidos. Abra primeiro o aplicativo na TV para registrar o aparelho.');
   const rows=await db('portal_managed_devices?id=eq.'+links[0].managed_device_id+'&select=id,key_hash,active,reseller_id,archived_at');const device=rows[0];
   if(!device||device.key_hash!==digest||!device.active||device.archived_at)throw new ApiError(403,'Dispositivo indisponível. Revise o cadastro no painel.');
   if(!admin&&(device.reseller_id!==user.id||('reseller_id' in b&&b.reseller_id!==user.id&&b.reseller_id!==null)))throw new ApiError(403,'Sua conta não pode vincular este dispositivo. Solicite a atribuição ao administrador.');
   const patch:any={display_name:text(b.name,100)};
   if(admin&&'reseller_id' in b){
    const reseller=b.reseller_id===null?null:text(b.reseller_id,36);
    if(reseller&&!/^[a-f0-9-]{36}$/i.test(reseller))throw new ApiError(400,'Parceiro inválido.');
    if(reseller){const staff=await db('portal_staff?user_id=eq.'+reseller+'&role=eq.reseller&active=eq.true');if(!staff.length)throw new ApiError(400,'Parceiro indisponível.');}
    patch.reseller_id=reseller;
   }
   const changed=await db('portal_managed_devices?id=eq.'+device.id+'&key_hash=eq.'+digest+'&active=eq.true'+(!admin?'&reseller_id=eq.'+user.id:''),'PATCH',patch);
   if(!changed.length)throw new ApiError(409,'O vínculo mudou durante a operação. Atualize o painel antes de continuar.');
   return reply({message:'Dispositivo vinculado. Licença, lista e período de teste preservados.'});
  }
  if(action==='device-create'){
   const mac=macOf(b.mac),name=text(b.name);let reseller=admin?(b.reseller_id||null):user.id;
   if(reseller){const staff=await db('portal_staff?user_id=eq.'+encodeURIComponent(reseller)+'&active=eq.true');if(!staff.length)throw new ApiError(400,'Revendedor não disponível.');}
   // The app owns its installation identity. Store a hash of the key shown on
   // its login screen so the Portal and app refer to the same device.
   const suppliedKey=typeof b.device_key==='string'?text(b.device_key,128):'';
   if(!suppliedKey||suppliedKey.length<6)throw new ApiError(400,'Informe a chave de pelo menos 6 caracteres exibida no aplicativo.');
   const key=suppliedKey;
   await db('portal_managed_devices','POST',{mac,display_name:name,reseller_id:reseller,key_hash:await hash(key)});
   return reply({message:'Dispositivo vinculado ao ELVANOQ Play.'});
  }
  if(action==='device-update'){
   const id=text(b.id,40);if(!/^[0-9a-f-]{36}$/.test(id))throw new ApiError(400,'Dispositivo inválido.');
   const rows=await db('portal_managed_devices?id=eq.'+id+'&select=id,reseller_id,archived_at');if(!rows.length||(!admin&&rows[0].reseller_id!==user.id))throw new ApiError(403,'Dispositivo não autorizado.');
   if(rows[0].archived_at)throw new ApiError(400,'Restaure o dispositivo antes de alterar seu estado.');
   const patch:any={};if(typeof b.active==='boolean')patch.active=b.active;if('name' in b)patch.display_name=text(b.name,100);
   if('expires_at' in b)throw new ApiError(400,'A validade é calculada pela licença. Registre a confirmação do pagamento para liberar um ano.');
   if(!Object.keys(patch).length)throw new ApiError(400,'Nenhuma alteração informada.');await db('portal_managed_devices?id=eq.'+id,'PATCH',patch);return reply({message:'Dispositivo atualizado.'});
  }
  if(action==='license-set-lifetime'){
   if(!admin)throw new ApiError(403,'Somente o administrador altera licenças vitalícias.');
   if(typeof b.lifetime!=='boolean')throw new ApiError(400,'Informe o tipo de licença.');
   const mac=await adminDeviceMac(b),reason=text(b.reason,500);
   if(reason.length<5)throw new ApiError(400,'Informe um motivo com pelo menos 5 caracteres.');
   const license=await db('rpc/portal_license_set_lifetime','POST',{p_mac:mac,p_lifetime:b.lifetime,p_actor:user.id,p_reason:reason});
   return reply({message:b.lifetime?'Licença vitalícia concedida.':'Licença vitalícia removida. Prazos anteriores preservados.',license});
  }
  if(action==='license-confirm-payment'){
   if(!admin)throw new ApiError(403,'Operação exclusiva do administrador.');
   const mac=await adminDeviceMac(b),reference=text(b.payment_reference,120);
   if(reference.length<8||!Number.isSafeInteger(b.amount_cents)||b.amount_cents<=0||b.amount_cents>2147483647)throw new ApiError(400,'Informe referência e valor em centavos válidos.');
   const license=await db('rpc/portal_license_confirm_payment','POST',{p_mac:mac,p_reference:reference,p_amount_cents:b.amount_cents,p_actor:user.id});
   return reply({message:license.duplicate?'Este pagamento já foi confirmado.':'Pagamento confirmado pelo administrador. Licença anual liberada.',license});
  }
  if(action==='staff-save'){
   if(!admin)throw new ApiError(403,'Acesso restrito ao administrador.');
   const email=text(b.email,254).toLowerCase();let found=null;for(let page=1;page<=20;page++){const r=await fetch(base+'/auth/v1/admin/users?page='+page+'&per_page=100',{headers:{apikey:service!,Authorization:'Bearer '+service}});if(!r.ok)throw new ApiError(500,'Falha ao consultar contas.');const data=await r.json();found=(data.users||[]).find((u:any)=>u.email?.toLowerCase()===email);if(found||(data.users||[]).length<100)break;}
   let generatedPassword=null;
   const partnerName=!found?text(b.name,100):'';
   if(!found){const password='Ev!9'+Array.from(crypto.getRandomValues(new Uint8Array(16))).map(v=>v.toString(16).padStart(2,'0')).join('');generatedPassword=password;if(password.length<12)throw new ApiError(400,'Use uma senha inicial com pelo menos 12 caracteres.');const r=await fetch(base+'/auth/v1/admin/users',{method:'POST',headers:{apikey:service!,Authorization:'Bearer '+service,'Content-Type':'application/json'},body:JSON.stringify({email,password,email_confirm:true})});if(!r.ok)throw new ApiError(400,'Não foi possível criar a conta. Confira e-mail e senha.');found=await r.json();}
   const existing=await db('portal_staff?user_id=eq.'+found.id);if(existing[0]?.role==='admin')throw new ApiError(400,'A conta administradora não pode ser alterada aqui.');
   await db('portal_staff'+(existing.length?'?user_id=eq.'+found.id:''),existing.length?'PATCH':'POST',{user_id:found.id,role:'reseller',active:b.active!==false,...(generatedPassword?{display_name:partnerName,must_change_password:true}:{})});return reply({message:generatedPassword?'Parceiro criado. Guarde a senha inicial; ela será exibida somente agora.':'Parceiro atualizado.',...(generatedPassword?{initial_password:generatedPassword}:{})});
  }
  throw new ApiError(400,'Operação inválida.');
 }catch(e){return reply({message:e instanceof ApiError?e.message:'Serviço indisponível. Tente novamente.'},e instanceof ApiError?e.status:500);}
});




