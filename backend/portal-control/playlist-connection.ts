// Structural normalization only. No provider fetch, redirect, log or identity/license write.
export function playlistConnection(kind:string,credentials:any){
 if(kind!=='m3u')return {kind,credentials};
 try{
  const u=new URL(credentials.url);
  if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.hash||u.pathname!=='/get.php')return {kind,credentials};
  const allowed=new Set(['username','password','type','output']);
  if([...u.searchParams.keys()].some(key=>!allowed.has(key)||u.searchParams.getAll(key).length!==1))return {kind,credentials};
  const username=u.searchParams.get('username'),password=u.searchParams.get('password');
  if(!username||!password||username.length>256||password.length>1024||/[\x00-\x1f\x7f]/.test(username+password))return {kind,credentials};
  if(u.searchParams.has('type')&&!['m3u','m3u_plus'].includes(u.searchParams.get('type')!))return {kind,credentials};
  if(u.searchParams.has('output')&&!['ts','m3u8'].includes(u.searchParams.get('output')!))return {kind,credentials};
  return {kind:'xtream',credentials:{host:u.origin,username,password}};
 }catch{return {kind,credentials};}
}


