import {eraseJob,allowedOrigin,verifyErasure,secureEqual} from './core.mjs';
const base=Deno.env.get('SUPABASE_URL')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!;
const origins=['https://set-in-comune-app.vercel.app',...(Deno.env.get('APP_ORIGINS')||'').split(',').filter(Boolean)];
async function http(path:string,method='GET',body?:unknown,bearer=service,key=service){const r=await fetch(base+path,{method,headers:{apikey:key,Authorization:'Bearer '+bearer,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok){if(['DELETE','PUT'].includes(method)&&path.startsWith('/auth/v1/admin/users/')&&r.status===404)return null;throw new Error('Provider operation failed');}const s=await r.text();return s?JSON.parse(s):null;}
const rpc=(name:string,body:unknown={})=>http('/rest/v1/rpc/'+name,'POST',body);
async function listFiles(bucket:string,prefix:string):Promise<string[]>{
 const files:string[]=[];const folders=[prefix];let scanned=0;
 while(folders.length){const folder=folders.shift()!;for(let offset=0;;offset+=100){if(++scanned>20)throw new Error('Storage scan limit');const rows=await http('/storage/v1/object/list/'+bucket,'POST',{prefix:folder,limit:100,offset,sortBy:{column:'name',order:'asc'}});if(!Array.isArray(rows))throw new Error('Invalid storage response');for(const row of rows){if(typeof row.name!=='string'||row.name.includes('/')||row.name.includes('..'))throw new Error('Invalid storage entry');if(row.id===null)folders.push(folder+row.name+'/');else files.push(folder+row.name);}if(rows.length<100)break;}}
 return files;
}
async function runJobs(){const jobs=await rpc('claim_account_erasures');let completed=0;for(const job of jobs){if(await eraseJob(job,{
 revoke:async(uid:string)=>{await http('/auth/v1/admin/users/'+uid,'PUT',{ban_duration:'876000h'});},
 list:listFiles,remove:(bucket:string,paths:string[])=>http('/storage/v1/object/'+bucket,'DELETE',{prefixes:paths}),
 eraseRecords:(uid:string,lease:string)=>rpc('erase_account_records',{p_user:uid,p_lease:lease}),
 deleteAuth:(uid:string)=>http('/auth/v1/admin/users/'+uid,'DELETE'),finish:(uid:string,lease:string,done:boolean)=>rpc('finish_account_erasure',{p_user:uid,p_lease:lease,p_done:done})}))completed++;}return completed;}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'',cors=allowedOrigin(origin,origins)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}:{};
 const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{...cors,'Cache-Control':'no-store'}});
 if(req.method==='OPTIONS')return new Response(null,{status:allowedOrigin(origin,origins)?204:403,headers:cors});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 const authorization=req.headers.get('authorization')||'';
 if(!authorization.startsWith('Bearer '))return reply({error:'Accedi di nuovo.'},401);
 const bearer=authorization.slice(7);
 try{
  // Dedicated 256-bit server hook, compared without logging or returning it.
  if(/^[A-Za-z0-9_-]{43}$/.test(bearer)){const c=await rpc('push_worker_config');if(!c?.hookSecret||!await secureEqual(bearer,c.hookSecret))return reply({error:'Unauthorized'},401);return reply({completed:await runJobs()});}
  if(!allowedOrigin(origin,origins))return reply({error:'Origine non consentita.'},403);
  if(Number(req.headers.get('content-length')||0)>2048)return reply({error:'Richiesta non valida.'},400);
  const text=await req.text();if(text.length>2048)return reply({error:'Richiesta non valida.'},400);
  let currentUser;try{currentUser=await http('/auth/v1/user','GET',undefined,bearer,anon);}catch{return reply({error:'Accedi di nuovo.'},401);}
  let verified;try{verified=await verifyErasure(JSON.parse(text),bearer,{
   getUser:async()=>currentUser,
   reauthenticate:(email:string,password:string)=>http('/auth/v1/token?grant_type=password','POST',{email,password},anon,anon)
  });}catch{return reply({code:'P0001',message:'Conferma e password non valide, oppure troppi tentativi. Riprova più tardi.'},400);}
  const result=await rpc('prepare_account_erasure',{p_user:verified.userId});
  await http('/auth/v1/logout?scope='+(result.status==='review'?'local':'global'),'POST',undefined,verified.temporaryToken,anon);
  if(result.status==='review')return reply(result);
  await runJobs();return reply({status:'queued'});
 }catch{return reply({error:'Operazione non completata. La richiesta già registrata verrà riprovata; contatta il gestore se il problema persiste.'},503);}
});
