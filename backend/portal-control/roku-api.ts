import {UNCLAIMED_PLAYLIST_KEY} from './visual-playlist.ts';
import {playlistConnection} from './playlist-connection.ts';
// Roku identities never enter legacy identity storage. Raw client IDs are hashed once, server-side.
export async function handleRoku(req:Request,b:any,c:any){
 const {db,hash,ApiError,base,service,text,http}=c;
 const action=b.action;
 function code(value:any){if(typeof value!=='string'||value.length>64)throw new ApiError(400,'Informe o código exibido na Roku.');const v=value.replace(/\s/g,'').toUpperCase();if(!/^ROKU-[A-Z0-9]{8}-[A-Z0-9]{8}$/.test(v))throw new ApiError(400,'Use o código Roku no formato ROKU-XXXXXXXX-XXXXXXXX.');return v;}
 function client(value:any){if(typeof value!=='string'||!value.length||value.length>512||/[\x00-\x1f\x7f]/.test(value)||!value.trim())throw new ApiError(400,'Identificação Roku inválida.');return value;}
 function key(value:any,required=true){if(value===undefined&&!required)return null;if(typeof value!=='string'||!/^[A-Za-z0-9-]{6,128}$/.test(value))throw new ApiError(400,'Informe a chave exibida na Roku.');return value;}
 const native=['roku-device-register','roku-license-status','roku-playlist-sync','roku-metadata'].includes(action);
 const admin=['roku-device-bind','roku-device-update','roku-device-assign','roku-device-rebind','roku-license-renew','roku-license-set-lifetime'].includes(action);
 const visual=native||action==='roku-playlist'||action==='roku-device-bind'?code(b.deviceCode):null;
 const clientHash=native?await hash(client(b.rokuClientId)):null;
 const quota=await db('rpc/portal_rate_limit','POST',{p_bucket:await hash('roku:'+action+':'+(clientHash||visual||String(b.id||''))),p_limit:action==='roku-playlist'?30:60,p_seconds:900});
 if(quota!==true)throw new ApiError(429,'Muitas tentativas. Aguarde alguns minutos.');
 let actor=null;
 if(admin){const bearer=req.headers.get('authorization');if(!bearer?.startsWith('Bearer '))throw new ApiError(401,'Entre para continuar.');const response=await fetch(base+'/auth/v1/user',{headers:{apikey:service,Authorization:bearer}});if(!response.ok)throw new ApiError(401,'Sessão expirada. Entre novamente.');actor=(await response.json()).id;}
 const deviceKey=key(b.device_key??b.deviceKey,action==='roku-playlist-sync'||action==='roku-playlist'||action==='roku-device-bind'||action==='roku-metadata');
 if(native&&deviceKey)await db('rpc/portal_native_binding_claim','POST',{p_platform:'roku',p_identity:clientHash,p_key_hash:await hash(deviceKey),p_device_code:visual});
 let operation:any,data:any={};
 if(action==='roku-metadata'){
  const permitted=await db('rpc/portal_roku_operation','POST',{p_operation:'sync',p_client_hash:clientHash,p_code:visual,p_key_hash:await hash(deviceKey),p_actor:null,p_data:{}});
  if(permitted?.license?.can_play!==true)throw new ApiError(403,'Licença Roku sem permissão para consultar metadados.');
  const token=Deno.env.get('TMDB_ACCESS_TOKEN');if(!token)throw new ApiError(503,'Metadados indisponíveis no momento.');
  const mediaType=b.media_type==='tv'?'tv':'movie';
  const tmdbId=Number.isInteger(b.tmdb_id)&&b.tmdb_id>0?b.tmdb_id:null;
  if(b.mode==='details'||b.mode==='season'){
   if(!tmdbId)throw new ApiError(400,'Identificação de metadados inválida.');
   let path='/'+mediaType+'/'+tmdbId;
   if(b.mode==='season'){
    const seasonNumber=Number.isInteger(b.season_number)&&b.season_number>=0&&b.season_number<=99?b.season_number:null;
    if(seasonNumber===null)throw new ApiError(400,'Temporada inválida.');
    path+='/season/'+seasonNumber;
   }else path+='?append_to_response=videos,recommendations';
   const detailResponse=await fetch('https://api.themoviedb.org/3'+path+(b.mode==='season'?'?language=pt-BR':'&language=pt-BR'),{headers:{Authorization:'Bearer '+token,Accept:'application/json'},signal:AbortSignal.timeout(8000)});
   if(!detailResponse.ok)throw new ApiError(503,'Não foi possível consultar detalhes agora.');
   const detail=await detailResponse.json();
   if(b.mode==='season'){
    const episodes=(detail.episodes||[]).slice(0,60).map((episode:any)=>({id:episode.id,number:episode.episode_number,name:episode.name||'',overview:episode.overview||'',still_path:episode.still_path||null,air_date:episode.air_date||null,runtime:episode.runtime||null}));
    return {found:true,media_type:mediaType,season_number:detail.season_number,episodes};
   }
   const trailer=(detail.videos?.results||[]).find((video:any)=>video.site==='YouTube'&&video.type==='Trailer'&&video.key)||null;
   const seasons=(detail.seasons||[]).filter((season:any)=>season.season_number>=0).map((season:any)=>({number:season.season_number,name:season.name||'',episode_count:season.episode_count||0,poster_path:season.poster_path||null,air_date:season.air_date||null}));
   const recommendations=(detail.recommendations?.results||[]).slice(0,6).map((item:any)=>({id:item.id,title:item.title||item.name||'',poster_path:item.poster_path||null,media_type:item.media_type||mediaType}));
   return {found:true,media_type:mediaType,item:{id:detail.id,title:detail.title||detail.name||'',overview:detail.overview||'',poster_path:detail.poster_path||null,backdrop_path:detail.backdrop_path||null,release_date:detail.release_date||detail.first_air_date||null,vote_average:detail.vote_average||null,genres:(detail.genres||[]).map((genre:any)=>genre.name||'').filter((name:string)=>name!==''),seasons,trailer:trailer?{site:'YouTube',key:trailer.key,name:trailer.name||'Trailer'}:null,recommendations}};
  }
  const query=text(b.query,160);
  const response=await fetch('https://api.themoviedb.org/3/search/'+mediaType+'?language=pt-BR&include_adult=false&query='+encodeURIComponent(query),{headers:{Authorization:'Bearer '+token,Accept:'application/json'},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new ApiError(503,'Não foi possível consultar metadados agora.');
  const first=(await response.json())?.results?.[0];
  if(!first)return {found:false};
  return {found:true,media_type:mediaType,item:{id:first.id,title:first.title||first.name||'',original_title:first.original_title||first.original_name||'',overview:first.overview||'',poster_path:first.poster_path||null,backdrop_path:first.backdrop_path||null,release_date:first.release_date||first.first_air_date||null,vote_average:first.vote_average||null,genre_ids:Array.isArray(first.genre_ids)?first.genre_ids:[]}};
 }
 if(action==='roku-device-register'){
  if(b.platform!=='roku')throw new ApiError(400,'Plataforma Roku inválida.');operation='register';data={name:text(b.deviceName,100)};
 }else if(action==='roku-license-status')operation='status';
 else if(action==='roku-playlist-sync')operation='sync';
 else if(action==='roku-playlist'){
  const requestedKind=b.kind;if(!['m3u','xtream'].includes(requestedKind))throw new ApiError(400,'Tipo de lista inválido.');
  const {kind,credentials}=playlistConnection(requestedKind,requestedKind==='m3u'?{url:http(b.url)}:{host:http(b.host),username:text(b.username,256),password:text(b.password,1024)});
  operation='playlist';data={name:text(b.name,100),kind,credentials,origin:new URL(kind==='m3u'?credentials.url:credentials.host).origin};
 }else if(action==='roku-device-bind')operation='bind';
 else if(admin){
  const id=text(b.id,36);if(!/^[a-f0-9-]{36}$/i.test(id))throw new ApiError(400,'Dispositivo Roku inválido.');
  const operations:any={'roku-device-update':'update','roku-device-assign':'assign','roku-device-rebind':'rebind','roku-license-renew':'renew','roku-license-set-lifetime':'lifetime'};
  operation='admin';data={id,operation:operations[action]};
  if(action==='roku-device-update'){if(typeof b.active==='boolean')data.active=b.active;if('name' in b)data.name=text(b.name,100);if(!('active' in data)&&!('name' in data))throw new ApiError(400,'Nenhuma alteração informada.');}
  if(action==='roku-device-assign'){if(b.reseller_id!==null&&!/^[a-f0-9-]{36}$/i.test(b.reseller_id||''))throw new ApiError(400,'Responsável inválido.');data.reseller_id=b.reseller_id;}
  if(action==='roku-device-rebind'||action==='roku-license-set-lifetime'){data.reason=text(b.reason,500);if(data.reason.length<5)throw new ApiError(400,'Informe o motivo com pelo menos cinco caracteres.');}
  if(action==='roku-device-rebind')data.restore=b.restore===true;
  if(action==='roku-license-set-lifetime'){if(typeof b.lifetime!=='boolean')throw new ApiError(400,'Informe o tipo de licença.');data.lifetime=b.lifetime;}
  if(action==='roku-license-renew'){data.payment_reference=text(b.payment_reference,120);data.amount_cents=b.amount_cents;if(data.payment_reference.length<8||!Number.isSafeInteger(data.amount_cents)||data.amount_cents<=0||data.amount_cents>2147483647)throw new ApiError(400,'Referência ou valor inválidos.');}
 }else throw new ApiError(400,'Operação Roku inválida.');
 const result=await db('rpc/portal_roku_operation','POST',{p_operation:operation,p_client_hash:clientHash,p_code:visual,p_key_hash:action==='roku-device-rebind'&&!deviceKey?UNCLAIMED_PLAYLIST_KEY:deviceKey?await hash(deviceKey):null,p_actor:actor,p_data:data});return {...result,...(action==='roku-playlist'?{playlist_kind:data.kind,converted_to_xtream:b.kind==='m3u'&&data.kind==='xtream'}:{}),...(result.license?{activation_status:result.license.status,activated:result.license.can_play===true}:{})};
}




