import webpush from 'npm:web-push@3.6.7';
import {processPushJobs,sameSecret} from './core.mjs';
const base=Deno.env.get('SUPABASE_URL')!;
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
let cache:{value:any,until:number}|null=null;
async function rpc(name:string,body:unknown={}){
 const response=await fetch(base+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000),redirect:'error'});
 if(!response.ok)throw new Error('Internal operation failed');
 const text=await response.text();return text?JSON.parse(text):null;
}
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const authorization=req.headers.get('authorization')||'';
 if(!/^Bearer [A-Za-z0-9_-]{43}$/.test(authorization))return new Response('Unauthorized',{status:401});
 try{
  if(!cache||cache.until<Date.now())cache={value:await rpc('push_worker_config'),until:Date.now()+60000};
  const config=cache.value;
  if(!config?.enabled||!await sameSecret(authorization.slice(7),config.hookSecret))return new Response('Unauthorized',{status:401});
  const jobs=await rpc('claim_push_jobs');
  const result=await processPushJobs({jobs,config,send:(sub:any,payload:string,options:any)=>webpush.sendNotification(sub,payload,options),finish:(job:string,lease:string,status:number)=>rpc('finish_push_job',{p_job:job,p_lease:lease,p_status:status})});
  return Response.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch{return new Response('Unable to dispatch notifications',{status:503});}
});
