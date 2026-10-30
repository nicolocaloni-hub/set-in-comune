const hosts=new Set(['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com']);
export function allowedPushEndpoint(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&value.length<=2048&&(hosts.has(u.hostname)||/^[a-z0-9-]+\.notify\.windows\.com$/.test(u.hostname));}catch{return false;}}
export function pushPayload(job){
 if(!/^[a-f0-9-]{36}$/i.test(job.bookingId)||!/^[a-f0-9-]{36}$/i.test(job.userId)||!['message','request'].includes(job.kind))throw new Error('Invalid job');
 return {kind:job.kind,userId:job.userId,url:`/#${job.kind==='message'?'messages':'bookings'}?booking=${job.bookingId}`,tag:`${job.kind}-${job.bookingId}`,unreadTotal:Math.max(0,Number(job.unreadTotal)||0)};
}
export async function processPushJobs({jobs,config,send,finish}){
 const result={processed:0,sent:0,retry:0,expired:0,failed:0};
 for(let offset=0;offset<jobs.length;offset+=4)await Promise.all(jobs.slice(offset,offset+4).map(async job=>{
  let status=0;
  try{
   if(!allowedPushEndpoint(job.endpoint))throw {statusCode:400};
   await send({endpoint:job.endpoint,keys:{p256dh:job.p256dh,auth:job.auth}},JSON.stringify(pushPayload(job)),{TTL:3600,urgency:'normal',timeout:10000,vapidDetails:{subject:config.subject,publicKey:config.publicKey,privateKey:config.privateKey}});status=201;
  }catch(error){status=Number(error?.statusCode)||0;}
  await finish(job.jobId,job.leaseToken,status);result.processed++;
  if(status>=200&&status<300)result.sent++;else if([404,410].includes(status))result.expired++;else if([400,401,403].includes(status))result.failed++;else result.retry++;
 }));
 return result;
}
export async function sameSecret(left,right){if(typeof left!=='string'||typeof right!=='string')return false;const digest=async x=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(x)));const [a,b]=await Promise.all([digest(left),digest(right)]);let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a[i]^b[i];return mismatch===0;}
