// Samsung authenticates its native identity; the legacy database key stays internal.
export async function resolveNativeServerCode(b:any, c:any) {
 const platform=b.platform||'samsung-msx',lg=platform==='lg-msx'||platform==='webos',bindingPlatform=lg?'webos':platform;
 const {db,hash,ApiError,webosId,text,serverCode,serverHost}=c;
 if(b.mac)throw new ApiError(400,'Use a identificação do aplicativo da TV.');
 const id=webosId(b.device_id),key=text(b.device_key,128),code=serverCode(b.code);
 if(!/^\d{6,128}$/.test(key))throw new ApiError(400,'Chave do dispositivo inválida.');
 const allowed=await db('rpc/portal_rate_limit','POST',{p_bucket:await hash('native-server-code:'+platform+':'+id),p_limit:30,p_seconds:900});
 if(allowed!==true)throw new ApiError(429,'Muitas tentativas. Aguarde alguns minutos.');
 const keyHash=await hash(key);
 const links=await db('portal_webos_devices?lgudid_hash=eq.'+id+'&platform=eq.'+bindingPlatform+'&select=managed_device_id,device_key_hash');
 const link=links[0];
 if(!link||links.length!==1||link.device_key_hash!==keyHash)throw new ApiError(403,'Identificação ou chave inválidas.');
 const devices=await db('portal_managed_devices?id=eq.'+link.managed_device_id+'&select=id,mac,key_hash,active,archived_at,display_name');
 const device=devices[0];
 if(!device||device.key_hash!==keyHash)throw new ApiError(403,'Identificação ou chave inválidas.');
 if(!device.active||device.archived_at)throw new ApiError(403,'Esta TV está desativada.');
 const rows=await db('portal_server_codes?code=eq.'+encodeURIComponent(code)+'&select=code,host,updated_at');
 if(!rows[0])throw new ApiError(404,'Código de servidor não encontrado.');
 const server=rows[0],host=serverHost(server.host);
 const access=await db('rpc/portal_code_access','POST',{p_mac:device.mac,p_code:code});
 if(!access.can_connect)throw new ApiError(403,'Código sem acesso. Consulte a renovação ou o responsável.');
 // Reuse the transactional registration and its existing capacity enforcement.
 const result=await db('rpc/portal_code_device_register','POST',{p_mac:device.mac,p_key_hash:keyHash,p_code:code,p_name:device.display_name||(platform==='ios-msx'?'iPhone / iPad (MSX)':platform==='titan'?'TV Titan OS':lg?'TV LG':'TV Samsung (MSX)'),p_platform:platform,p_version:typeof b.app_version==='string'?b.app_version.slice(0,32):''});
 if(result.code_access?.can_connect!==true||result.license?.can_play!==true)throw new ApiError(403,'Código sem acesso para esta TV.');
 return {server:{code:server.code,host,updated_at:server.updated_at},server_code:code,license:result.license,code_access:result.code_access};
}

// Compatibility for Samsung regression tests.
export const resolveSamsungServerCode=resolveNativeServerCode;
