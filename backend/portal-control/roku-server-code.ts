// Resolves a server and atomically records its device association for capacity control.
export async function resolveRokuServerCode(b:any,c:any){
 const {db,hash,ApiError}=c;
 const fail=(status:number,message:string):never=>{throw new ApiError(status,message);};
 const unavailable=()=>fail(503,'Serviço temporariamente indisponível. Tente novamente em instantes.');
 const fields=new Set(['action','rokuClientId','deviceCode','code']);
 if(Object.keys(b).some(k=>!fields.has(k)))fail(400,'Campos não permitidos nesta operação Roku.');
 const client=b.rokuClientId;
 if(typeof client!=='string'||client.length<1||client.length>512||!client.trim()||/[\x00-\x1f\x7f]/.test(client)||/^(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i.test(client)||/^[0-9a-f]{12}$/i.test(client))fail(400,'Identificação Roku inválida.');
 // Never trim, lowercase or log the native client identifier.
 const clientHash=await hash(client);
 async function query(path:string,method='GET',body?:unknown){
  try{return await db(path,method,body,AbortSignal.timeout(10000));}catch(e){if(path==='rpc/portal_roku_server_code_link'&&e instanceof ApiError&&[403,404,409].includes(e.status))throw e;return unavailable();}
 }
 const quota=await query('rpc/portal_rate_limit','POST',{p_bucket:await hash('roku-server-code-resolve:'+clientHash),p_limit:60,p_seconds:900});
 if(quota===false)fail(429,'Muitas tentativas. Aguarde alguns minutos.');
 if(quota!==true)unavailable();
 let visual:string|undefined;
 if(b.deviceCode!==undefined){
  if(typeof b.deviceCode!=='string'||b.deviceCode.length>64)fail(400,'Código Roku inválido.');
  visual=b.deviceCode.replace(/\s/g,'').toUpperCase();
  if(!/^ROKU-[A-Z0-9]{8}-[A-Z0-9]{8}$/.test(visual!))fail(400,'Use o código Roku no formato ROKU-XXXXXXXX-XXXXXXXX.');
 }
 // Match the existing Android server-code rule, including its alphanumeric first character.
 if(typeof b.code!=='string')fail(400,'Código de servidor inválido.');
 const code=b.code.trim().toLowerCase();
 if(!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(code))fail(400,'Use um código de 3 a 32 caracteres: letras, números, hífen ou sublinhado.');
 const devices=await query('portal_roku_devices?client_hash=eq.'+clientHash+'&select=id,device_code&limit=1');
 if(!Array.isArray(devices))unavailable();
 const device=devices[0];
 if(!device||(visual!==undefined&&device.device_code!==visual))fail(403,'Dispositivo Roku não registrado ou identificação inválida.');
 const license=await query('rpc/portal_roku_license','POST',{p_id:device.id});
 if(!license||typeof license.status!=='string')unavailable();
 if(license.status!=='active'||license.can_play!==true)fail(403,'É necessário ativar a licença deste dispositivo Roku.');
 const servers=await query('portal_server_codes?code=eq.'+encodeURIComponent(code)+'&select=code,host,updated_at,active,revoked,validity,expires_at&limit=1');
 if(!Array.isArray(servers))unavailable();
 const server=servers[0];
 if(!server||server.active!==true||server.revoked===true||(server.validity!=='lifetime'&&!(server.validity==='annual'&&Date.parse(server.expires_at)>Date.now())))fail(404,'Código de servidor não encontrado ou inativo.');
 let host:URL;
 try{
  if(typeof server.host!=='string'||server.host.length>2048||server.host!==server.host.trim()||/[\s\\]/.test(server.host)||!/^https?:\/\//i.test(server.host))throw Error();
  host=new URL(server.host);
  if(!['http:','https:'].includes(host.protocol)||!host.hostname||host.username||host.password||host.search||host.hash||host.pathname!=='/')throw Error();
  const hostname=host.hostname;
  if(!hostname.startsWith('[')&&(!hostname.replace(/\.$/,'').split('.').every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))||hostname.length>253))throw Error();
 }catch{return unavailable();}
 if(server.code!==code||typeof server.updated_at!=='string'||!Number.isFinite(Date.parse(server.updated_at)))unavailable();
 const linked=await query('rpc/portal_roku_server_code_link','POST',{p_id:device.id,p_client_hash:clientHash,p_code:code});
 if(linked!==true)unavailable();
 return {ok:true,action:'roku-server-code-resolve',state:'active',payload:{server:{code,host:host!.origin,updated_at:new Date(server.updated_at).toISOString()}}};
}


