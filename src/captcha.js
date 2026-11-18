export const TURNSTILE_SCRIPT='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
export function validateCaptchaSiteKey(value=''){
 if(value==='')return '';
 if(typeof value!=='string'||!/^0x[A-Za-z0-9_-]{20,30}$/.test(value))throw new Error('Chiave pubblica Turnstile non valida. Non inserire la chiave segreta nel frontend.');
 return value;
}
// null = the widget could not run (blocked domain, network, Cloudflare outage): send without a
// token and let Supabase Auth decide. The browser gate is UX only; enforcement is server-side,
// so a broken widget must never silently stop every signup (incident of 18 November 2026).
export function captchaPayload(token,required=false){
 if(token===null)return {};
 if(!required&&!token)return {};
 if(typeof token!=='string'||!token.trim()||token.length>2048)throw new Error('Completa la verifica di sicurezza e riprova.');
 return {gotrue_meta_security:{captcha_token:token}};
}
export function createCaptchaGate(now=Date.now){
 let token='',issued=0;
 return {
  accept(value){captchaPayload(value,true);token=value;issued=now();},
  clear(){token='';issued=0;},
  take(){const value=token,age=now()-issued;token='';issued=0;if(age<0||age>=270000)throw new Error('Verifica di sicurezza scaduta. Riprova.');captchaPayload(value,true);return value;}
 };
}
// Injecting the browser boundary lets tests exercise lifecycle without real challenges.
export function createCaptchaClient({demo=false,siteKey='',document:doc=globalThis.document,window:win=globalThis.window}={}){
 validateCaptchaSiteKey(siteKey);
 let loadPromise,active;
 const load=()=>{
  if(win.turnstile)return Promise.resolve(win.turnstile);
  if(loadPromise)return loadPromise;
  loadPromise=new Promise((resolve,reject)=>{
   const script=doc.createElement('script');script.src=TURNSTILE_SCRIPT;script.async=true;script.defer=true;
   const fail=()=>{clearTimeout(timer);script.remove();loadPromise=null;reject(new Error('Verifica di sicurezza non disponibile. Controlla la connessione e riprova.'));};
   const timer=setTimeout(fail,15000);
   script.onerror=fail;script.onload=()=>{clearTimeout(timer);if(win.turnstile)resolve(win.turnstile);else fail();};doc.head.append(script);
  });return loadPromise;
 };
 const clear=()=>{if(active){active.gate.clear();if(active.id!==undefined)try{win.turnstile?.remove(active.id);}catch{};active=null;}};
 return {
  clear,
  async mount(form){
   clear();if(demo||!siteKey||!form)return;
   const box=doc.createElement('div'),status=doc.createElement('p');status.className='fineprint';status.setAttribute('role','status');status.textContent='Caricamento della verifica di sicurezza…';box.append(status);form.insertBefore(box,form.querySelector('button'));
   const entry={form,gate:createCaptchaGate(),id:undefined,failed:false};active=entry;
   const unavailable=()=>{if(active!==entry)return;entry.gate.clear();entry.failed=true;status.textContent='Verifica di sicurezza non disponibile: puoi continuare comunque.';};
   let provider;try{provider=await load();}catch{unavailable();return;}
   if(active!==entry||!form.isConnected)return;
   try{entry.id=provider.render(box,{sitekey:siteKey,language:'it',action:form.id==='automatic-erasure-form'?'erasure':form.id==='reset-form'?'recovery':form.dataset.signup==='true'?'signup':'login','response-field':false,
    callback:value=>{if(active!==entry)return;entry.gate.accept(value);entry.failed=false;status.textContent='Verifica di sicurezza completata.';},
    'expired-callback':()=>{if(active===entry){entry.gate.clear();status.textContent='Verifica scaduta: completala di nuovo.';}},
    'error-callback':()=>{unavailable();return true;},
    'unsupported-callback':unavailable,
    'timeout-callback':()=>{if(active===entry){entry.gate.clear();status.textContent='Verifica scaduta: riprova.';}}
   });}catch{unavailable();}
  },
  // Returns a token, or null when the widget could not run (see captchaPayload).
  take(form){if(demo||!siteKey)return '';if(active?.form!==form)throw new Error('Completa la verifica di sicurezza e riprova.');if(active.failed)return null;return active.gate.take();},
  reset(form){if(active?.form===form){active.gate.clear();if(active.id!==undefined)try{win.turnstile?.reset(active.id);}catch{};}}
 };
}
