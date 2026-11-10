import {playlistConnection} from './playlist-connection.ts';
export const UNCLAIMED_PLAYLIST_KEY='0'.repeat(64); // Marker, not a device key or usable key digest.
export async function saveVisualPlaylist(b:any,c:any){
 const {db,hash,ApiError,macOf,http,text}=c;
 const platform=b.action==='playlist'?'android':b.action==='webos-playlist'?'webos':'roku';
 let identity:string;
 if(platform==='android')identity=macOf(b.mac);
 else{identity=String(platform==='webos'?b.tv_code||'':b.deviceCode||'').replace(/\s/g,'').toUpperCase();if(!(platform==='webos'?/^(LG|SM|IOS|TT)-[A-F0-9]{12}$/:/^ROKU-[A-Z0-9]{8}-[A-Z0-9]{8}$/).test(identity))throw new ApiError(400,'Confira o código exibido na TV.');}
 const allowed=await db('rpc/portal_rate_limit','POST',{p_bucket:await hash('visual-playlist:'+platform+':'+identity),p_limit:30,p_seconds:900});
 if(allowed!==true)throw new ApiError(429,'Muitas tentativas. Aguarde alguns minutos.');
 if(!['m3u','xtream'].includes(b.kind))throw new ApiError(400,'Tipo de lista inválido.');
 const {kind,credentials}=playlistConnection(b.kind,b.kind==='m3u'?{url:http(b.url)}:{host:http(b.host),username:text(b.username,256),password:text(b.password,1024)});
 const name=text(b.name,100),origin=new URL(kind==='m3u'?credentials.url:credentials.host).origin;
 let result:any;
 if(platform==='roku'){
  const rows=await db('portal_roku_devices?device_code=eq.'+encodeURIComponent(identity)+'&select=id,key_hash,active&limit=1');
  const d=rows[0];if(!d||!d.active||!d.key_hash)throw new ApiError(403,'Abra primeiro o aplicativo na Roku para registrar este aparelho. Se estiver bloqueado, procure o responsável.');
  result=await db('rpc/portal_roku_operation','POST',{p_operation:'playlist',p_client_hash:null,p_code:identity,p_key_hash:d.key_hash,p_actor:null,p_data:{name,kind,credentials,origin}});
 }else{
  let mac=identity,keyHash=UNCLAIMED_PLAYLIST_KEY;
  if(platform==='webos'){
   const links=await db('portal_webos_devices?lgudid_hash=like.'+identity.split('-')[1].toLowerCase()+'*&platform=eq.'+(identity.startsWith('TT-')?'titan':identity.startsWith('IOS-')?'ios-msx':identity.startsWith('SM-')?'samsung-msx':'webos')+'&select=managed_device_id,device_key_hash');
   if(links.length!==1)throw new ApiError(403,'Abra primeiro o aplicativo na TV para registrar um código válido.');
   const rows=await db('portal_managed_devices?id=eq.'+links[0].managed_device_id+'&select=mac,key_hash,active');const d=rows[0];
   if(!d||d.key_hash!==links[0].device_key_hash||!d.active)throw new ApiError(403,'TV indisponível ou desativada. Procure o responsável.');mac=d.mac;keyHash=d.key_hash;
  }else{
   const rows=await db('portal_managed_devices?mac=eq.'+encodeURIComponent(mac)+'&select=key_hash,active');
   if(rows[0]){if(!rows[0].active)throw new ApiError(403,'Dispositivo desativado. Procure o responsável.');keyHash=rows[0].key_hash;}
  }
  result=await db('rpc/portal_playlist_register_host','POST',{p_mac:mac,p_key_hash:keyHash,p_supplied_key:true,p_name:name,p_kind:kind,p_credentials:credentials,p_origin:origin,p_actor:null});
 }
 return {message:'Lista salva. Abra o aplicativo e atualize as Listas Salvas para carregar o conteúdo.',sync_available:true,playlist_kind:kind,converted_to_xtream:b.kind==='m3u'&&kind==='xtream',...(result.license?{license:result.license}:{}),...(result.code_access?{code_access:result.code_access}:{}),...(result.host_match?{host_match:result.host_match}:{})};
}
export async function matchesAndroidPlaylistKey(device:any,mac:string,key:string,c:any){
 if(!device)return false;
 const {db,hash}=c,keyHash=await hash(key);
 if(device.key_hash===keyHash)return true;
 if(device.key_hash!==UNCLAIMED_PLAYLIST_KEY||key.length<6)return false;
 // Compare-and-set: only the first native key can claim an unbound Android upload.
 // Existing keys, licenses, trials and device status are never overwritten.
 const changed=await db('portal_managed_devices?mac=eq.'+encodeURIComponent(mac)+'&key_hash=eq.'+UNCLAIMED_PLAYLIST_KEY+'&active=eq.true&select=key_hash','PATCH',{key_hash:keyHash});
 if(changed?.[0]?.key_hash===keyHash)return true;
 const current=await db('portal_managed_devices?mac=eq.'+encodeURIComponent(mac)+'&select=key_hash');
 return current[0]?.key_hash===keyHash;
}


