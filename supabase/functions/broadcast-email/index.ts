import {parseRequest,processBroadcast} from './core.mjs';
const base=Deno.env.get('SUPABASE_URL')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,brevoKey=Deno.env.get('BREVO_API_KEY')||'';
async function rpc(name:string,body:unknown={}){
 const r=await fetch(base+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000),redirect:'error'});
 if(!r.ok)throw new Error('Internal operation failed');const s=await r.text();return s?JSON.parse(s):null;
}
async function secureEqual(a:string,b:string){const h=async(s:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));const [x,y]=await Promise.all([h(a),h(b)]);let d=0;for(let i=0;i<x.length;i++)d|=x[i]^y[i];return d===0;}
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const authorization=req.headers.get('authorization')||'';
 if(!/^Bearer [A-Za-z0-9_-]{43}$/.test(authorization))return new Response('Unauthorized',{status:401});
 try{
  const config=await rpc('push_worker_config');
  if(!config?.hookSecret||!await secureEqual(authorization.slice(7),config.hookSecret))return new Response('Unauthorized',{status:401});
  if(!brevoKey)return new Response('Email provider not configured',{status:503});
  let request;try{request=parseRequest(await req.json());}catch{return new Response('Bad request',{status:400});}
  const result=await processBroadcast(request,{
   claim:(campaign:string,mode:string)=>rpc('claim_broadcast',{p_campaign:campaign,p_mode:mode}),
   send:async(m:{to:string,subject:string,html:string,text:string})=>{
    const r=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'api-key':brevoKey,'Content-Type':'application/json',Accept:'application/json'},
     body:JSON.stringify({sender:{name:'Rent to a Friend',email:'assistenza@rent-to-a-friend.it'},to:[{email:m.to}],replyTo:{email:'assistenza@rent-to-a-friend.it'},subject:m.subject,htmlContent:m.html,textContent:m.text,
      headers:{'List-Unsubscribe':'<mailto:assistenza@rent-to-a-friend.it?subject=NO>'},tags:['broadcast']}),
     signal:AbortSignal.timeout(15000),redirect:'error'});
    if(!r.ok)throw new Error('Send failed');
   },
   finish:(campaign:string,mode:string,u:string,l:string,ok:boolean)=>rpc('finish_broadcast',{p_campaign:campaign,p_mode:mode,p_user:u,p_lease:l,p_ok:ok})
  });
  return Response.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch{return new Response('Unable to send',{status:503});}
});
