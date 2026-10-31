export const buckets=['profile-photos','listing-photos','handoff-photos'];
export async function eraseJob(job,io){
 if(!/^[a-f0-9-]{36}$/i.test(job.user_id)||!/^[a-f0-9-]{36}$/i.test(job.lease))throw new Error('Invalid job');
 const uid=job.user_id;
 try{
  // Revoke all sessions before any physical deletion; SQL closure already rejects stale JWTs.
  await io.revoke(uid);
  for(const bucket of buckets){
   const files=await io.list(bucket,uid+'/');
   if(files.length>250||files.some(path=>!path.startsWith(uid+'/')||path.includes('..')))throw new Error('Unsafe storage path');
   if(files.length)await io.remove(bucket,files);
   if((await io.list(bucket,uid+'/')).length)throw new Error('Storage cleanup incomplete');
  }
  await io.eraseRecords(uid,job.lease);
  await io.deleteAuth(uid);
  await io.finish(uid,job.lease,true);
  return true;
 }catch{await io.finish(uid,job.lease,false);return false;}
}
export function allowedOrigin(value,origins){try{const u=new URL(value);return u.protocol==='https:'&&u.origin===value&&origins.includes(value);}catch{return false;}}

export async function verifyErasure(data,bearer,io){
 if(data?.confirmation!=='ELIMINA'||typeof data.password!=='string'||data.password.length<10||data.password.length>128)throw new Error('Conferma la cancellazione e inserisci la password.');
 const user=await io.getUser(bearer);if(!user?.id||!user.email||!user.email_confirmed_at)throw new Error('Accedi con email confermata.');
 const fresh=await io.reauthenticate(user.email,data.password);
 if(fresh?.user?.id!==user.id)throw new Error('Account non valido.');
 return {userId:user.id,temporaryToken:fresh.access_token};
}
export async function secureEqual(a,b){if(typeof a!=='string'||typeof b!=='string')return false;const h=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));const [x,y]=await Promise.all([h(a),h(b)]);let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;}
