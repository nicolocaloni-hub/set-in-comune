import {processEmailWork} from './core.mjs';
const base=Deno.env.get('SUPABASE_URL')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!;
const resendKey=Deno.env.get('RESEND_API_KEY')||'',brevoKey=Deno.env.get('BREVO_API_KEY')||'';
const from=Deno.env.get('EMAIL_FROM')||'Rent to a Friend <assistenza@rent-to-a-friend.it>';
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
  const work=await rpc('claim_email_work');
  const result=await processEmailWork(work,{
   // Booking digests go through Brevo (300/day free); Resend only while no Brevo key is set.
   sendEmail:async(m:{to:string,subject:string,text:string,html:string})=>{
    if(brevoKey){
     const r=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'api-key':brevoKey,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({sender:{name:'Rent to a Friend',email:'assistenza@rent-to-a-friend.it'},to:[{email:m.to}],replyTo:{email:'assistenza@rent-to-a-friend.it'},subject:m.subject,textContent:m.text,htmlContent:m.html}),signal:AbortSignal.timeout(15000),redirect:'error'});
     if(!r.ok)throw new Error('Send failed');
     return;
    }
    if(!resendKey)throw new Error('Missing key');
    const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+resendKey,'Content-Type':'application/json'},body:JSON.stringify({from,to:[m.to],reply_to:'assistenza@rent-to-a-friend.it',subject:m.subject,text:m.text,html:m.html}),signal:AbortSignal.timeout(15000),redirect:'error'});
    if(!r.ok)throw new Error('Send failed');
   },
   // Inactivity notices reuse Supabase Auth's Magic Link email (same Resend SMTP): its link signs the person in, which resets the clock.
   sendMagicLink:async(email:string,redirect:string)=>{
    const r=await fetch(base+'/auth/v1/otp?redirect_to='+encodeURIComponent(redirect),{method:'POST',headers:{apikey:anon,Authorization:'Bearer '+anon,'Content-Type':'application/json'},body:JSON.stringify({email,create_user:false}),signal:AbortSignal.timeout(15000),redirect:'error'});
    if(!r.ok)throw new Error('Send failed');
   },
   finishDigest:(u:string,l:string,ok:boolean)=>rpc('finish_email_digest',{p_user:u,p_lease:l,p_ok:ok}),
   finishNotice:(u:string,l:string,ok:boolean)=>rpc('finish_inactivity_notice',{p_user:u,p_lease:l,p_ok:ok})
  });
  return Response.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch{return new Response('Unable to send emails',{status:503});}
});
