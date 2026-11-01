import rawConfig from './config.js';
import {AUTH_REDIRECT_URL} from './auth-config.js';
import {validatePublicConfig,validEmail,validPassword,resourceId} from './security.js';
const config=validatePublicConfig(rawConfig.url,rawConfig.key);
import {sampleListings,sampleProfiles} from './data.js';
import {available,validateRental,nextActions,validateListing} from './domain.js';
import {validateTechnical,validateReview,validateChecklist,reportReasons} from './marketplace.js';
import {PHOTO_MAX_BYTES} from './photos.js';
export const isDemo = !config.url || !config.key || new URLSearchParams(globalThis.location?.search||'').get('demo')==='1';
const uuid=()=>{if(crypto.randomUUID)return crypto.randomUUID();const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=[...b].map(x=>x.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;};
const SESSION_KEY='sic-session-v2', PKCE_KEY='sic-pkce-v1', DEMO_KEY='sic-demo-v1';
function read(key,fallback,storage=localStorage) {try{return JSON.parse(storage.getItem(key)) || fallback;}catch{return fallback;}}
function pkceFlow(){const flow=read(PKCE_KEY,null);if(!flow||typeof flow.verifier!=='string'||!Number.isFinite(flow.created_at)||flow.created_at>Date.now()+5000||Date.now()-flow.created_at>3600000){localStorage.removeItem(PKCE_KEY);return null;}return flow;}
let session=read(SESSION_KEY,null,globalThis.sessionStorage);
let db=read(DEMO_KEY,{listings:sampleListings,bookings:[],messages:[],evidence:[],profile:{display_name:'Il tuo profilo demo',bio:'Filmmaker a Roma',zone:'Prati'}});
db.privacyRequests ||= [];db.notifications ||= [];db.inquiries ||= [];db.reviews ||= [];db.blocks ||= [];db.reports ||= [];
for(const sample of sampleListings){const existing=db.listings.find(l=>l.id===sample.id);if(existing)for(const key of ['brand','model','lens_mount','light_power_w','equipment_condition','included_tags'])if(existing[key]===undefined)existing[key]=sample[key]??(key==='included_tags'?[]:key==='light_power_w'?null:'');}
let savedDemo = JSON.stringify(db);
const save=()=>{const json=JSON.stringify(db);try{localStorage.setItem(DEMO_KEY,json);savedDemo=json;}catch{db=JSON.parse(savedDemo);throw new Error('Spazio della demo esaurito su questo browser. Rimuovi alcune foto dai tuoi annunci o ripristina la demo dal Profilo. Nessun piano a pagamento viene attivato.');}};
const storeSession=value=>{if(value){value={...value,expires_at:value.expires_at??(Number.isFinite(value.expires_in)?Math.floor(Date.now()/1000)+value.expires_in:NaN)};if(!value.access_token||!value.refresh_token||!value.user?.id||!Number.isFinite(value.expires_at))throw new Error('Risposta di accesso non valida. Riprova.');sessionStorage.setItem(SESSION_KEY,JSON.stringify(value));}else{sessionStorage.removeItem(SESSION_KEY);recoverySession=false;}session=value;};
let refreshPromise;
let recoverySession=false;
const safeFetch=(url,options={})=>fetch(url,{...options,mode:'cors',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',cache:'no-store',signal:AbortSignal.timeout(20000)});
async function auth(path,body) {
  const res=await safeFetch(config.url+'/auth/v1/'+path,{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!res.ok){if(res.status===429)throw new Error('Troppi tentativi. Attendi qualche minuto e riprova.');throw new Error(path.startsWith('token?grant_type=password')?'Email o password non corrette.':'Operazione di accesso non riuscita. Riprova o richiedi un nuovo link.');}
  return res.json();
}
async function startPkce(purpose){
  const verifier=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
  const challenge=btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  localStorage.setItem(PKCE_KEY,JSON.stringify({verifier,purpose,created_at:Date.now()}));
  return {code_challenge:challenge,code_challenge_method:'s256'};
}
const redirectPath=path=>path+'?redirect_to='+encodeURIComponent(AUTH_REDIRECT_URL);
async function token() {
  if(!session) return config.key;
  if(session.expires_at*1000 < Date.now()+60000) {
    refreshPromise ||= auth('token?grant_type=refresh_token',{refresh_token:session.refresh_token}).then(s=>{storeSession(s);return s.access_token;}).catch(e=>{storeSession(null);throw e;}).finally(()=>refreshPromise=null);
    return refreshPromise;
  }
  return session.access_token;
}
async function request(path, options={}) {
  const res=await safeFetch(config.url+path,{...options,headers:{apikey:config.key,Authorization:'Bearer '+await token(),'Content-Type':'application/json',...options.headers}});
  const raw=await res.text();let data;try{data=raw?JSON.parse(raw):null;}catch{data=null;}
  if(!res.ok){if(path==='/auth/v1/user'&&options.method==='PUT'){if(['current_password_required','current_password_mismatch'].includes(data?.code))throw new Error('La password attuale non è corretta. Riprova.');if(data?.code==='same_password')throw new Error('Scegli una password diversa da quella attuale.');if(data?.code==='reauthentication_needed')throw new Error('Accedi di nuovo prima di cambiare la password.');if(data?.code==='weak_password')throw new Error('La nuova password non rispetta i requisiti di sicurezza.');}if(res.status===401){storeSession(null);throw new Error('La sessione è scaduta. Accedi di nuovo.');}if(res.status===403)throw new Error('Non hai accesso a questa operazione.');if(res.status===429)throw new Error('Troppi tentativi. Attendi e riprova.');if(data?.code==='23505')throw new Error('Questa richiesta è già presente.');throw new Error(data?.code==='P0001'?data.message:'Operazione non riuscita. Controlla i dati e riprova.');}
  return data;
}
const rest=(table,query='')=>request('/rest/v1/'+table+query);
const post=(table,data)=>request('/rest/v1/'+table,{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(data)});
const rpc=(name,params)=>post('rpc/'+name,params);
function requireUser(){if(!api.user())throw new Error('Accedi per continuare.');}
function ownerFor(b){return db.listings.find(l=>l.id===b.listing_id)?.owner_id;}
export const api={
  user:()=>isDemo?{id:'demo-me',email:'Modalità dimostrativa'}:session?.user || null,
  async init(){
    if(isDemo)return false;
    recoverySession=false;
    pkceFlow();
    // Drop old persistent bearer tokens; the new session lives only in this tab.
    localStorage.removeItem('sic-session-v1');
    const url=new URL(location.href),fragment=new URLSearchParams(url.hash.slice(1));
    const code=url.searchParams.get('code');let recovery=false;
    if(code||fragment.has('access_token')||url.searchParams.has('error')||fragment.has('error')){
      url.searchParams.delete('code');url.searchParams.delete('error');url.searchParams.delete('error_code');url.searchParams.delete('error_description');url.hash='profile';
      history.replaceState(null,'',url.pathname+url.search+url.hash);
      if(!code)throw new Error('Richiedi un nuovo link e aprilo nello stesso browser usato per la richiesta.');
      const flow=pkceFlow();
      localStorage.removeItem(PKCE_KEY);
      if(!flow||!flow.verifier||!Number.isFinite(flow.created_at)||flow.created_at>Date.now()+5000||Date.now()-flow.created_at>3600000)throw new Error('Richiedi un nuovo link e aprilo nello stesso browser usato per la richiesta.');
      const result=await auth('token?grant_type=pkce',{auth_code:code,code_verifier:flow.verifier});
      storeSession(result);recovery=flow.purpose==='recovery';recoverySession=recovery;
    }
    if(session){try{await token();const user=await request('/auth/v1/user');storeSession({...session,user});}catch(e){storeSession(null);throw e;}}
    return recovery;
  },
  isPasswordRecovery:()=>recoverySession,
  async changePassword(password,currentPassword){
    if(isDemo)throw new Error('Il cambio password richiede un account reale. Non inserire password nella demo.');
    requireUser();
    const body={password:validPassword(password)};
    if(!recoverySession){
      if(typeof currentPassword!=='string'||!currentPassword.length||currentPassword.length>128)throw new Error('Inserisci la password attuale.');
      body.current_password=currentPassword;
    }
    await request('/auth/v1/user',{method:'PUT',body:JSON.stringify(body)});
    // Close the recovery session as well: a later change must authenticate again.
    await api.logout().catch(()=>{});
  },
  async login(email,password){recoverySession=false;storeSession(await auth('token?grant_type=password',{email:validEmail(email),password:validPassword(password)}));},
  async signup(email,password,display_name){const name=String(display_name||'').trim();if(name.length<2||name.length>60)throw new Error('Inserisci un nome tra 2 e 60 caratteri.');const params=await startPkce('signup');const s=await auth(redirectPath('signup'),{email:validEmail(email),password:validPassword(password),data:{display_name:name},...params});if(s.access_token)storeSession(s);return Boolean(s.access_token);},
  async reset(email){const params=await startPkce('recovery');await auth(redirectPath('recover'),{email:validEmail(email),...params});},
  async logout(){if(!isDemo&&session){try{await request('/auth/v1/logout',{method:'POST'});}finally{storeSession(null);localStorage.removeItem(PKCE_KEY);}}},
  async listings(){
    if(isDemo)return structuredClone(db.listings.filter(x=>x.active).map(l=>({...l,blocked:[...l.blocked,...db.bookings.filter(b=>b.listing_id===l.id&&['accepted','collected','returned'].includes(b.status)).map(b=>({start_date:b.start_date,end_date:b.end_date}))]})));
    const [items,periods]=await Promise.all([rest('listings','?active=eq.true&order=created_at.desc'),rest('listing_availability')]);
    return items.map(l=>({...l,blocked:[...l.blocked,...periods.filter(p=>p.listing_id===l.id)]}));
  },
  async myListings(){requireUser();return isDemo?structuredClone(db.listings.filter(x=>x.owner_id==='demo-me')):rest('listings','?owner_id=eq.'+api.user().id+'&order=created_at.desc');},
  async profile(){requireUser();if(isDemo)return structuredClone({...db.profile,completed_rentals:db.bookings.filter(b=>b.status==='completed'&&['demo-me'].some(id=>[b.owner_id,b.renter_id].includes(id))).length});return (await rest('profiles','?id=eq.'+api.user().id))[0];},
  async publicProfile(id){if(isDemo){if(id==='demo-me')return structuredClone({...db.profile,id,email_verified:false,completed_rentals:db.bookings.filter(b=>b.status==='completed'&&[b.owner_id,b.renter_id].includes(id)).length});const p=sampleProfiles.find(p=>p.id===id);if(!p)throw new Error('Profilo non disponibile.');return structuredClone({...p,completed_rentals:db.bookings.filter(b=>b.status==='completed'&&[b.owner_id,b.renter_id].includes(id)).length});}const rows=await rest('profiles','?id=eq.'+encodeURIComponent(id)+'&select=id,display_name,bio,zone,avatar_url,email_verified,created_at,completed_rentals');if(!rows.length)throw new Error('Profilo non disponibile.');return rows[0];},
  async publicListings(id){if(isDemo)return (await api.listings()).filter(l=>l.owner_id===id);return rest('listings','?owner_id=eq.'+encodeURIComponent(id)+'&active=eq.true&order=created_at.desc');},
  async saveProfile(data){requireUser();data=Object.fromEntries(['display_name','bio','zone','avatar_url'].filter(k=>Object.hasOwn(data,k)).map(k=>[k,data[k]]));if(Object.hasOwn(data,'display_name')&&(data.display_name.trim().length<2||data.display_name.trim().length>60))throw new Error('Inserisci un nome tra 2 e 60 caratteri.');if(isDemo){Object.assign(db.profile,data);db.listings.filter(l=>l.owner_id==='demo-me').forEach(l=>l.owner_name=db.profile.display_name);save();return;}const old=Object.hasOwn(data,'avatar_url')?(await api.profile()).avatar_url:'';await request('/rest/v1/profiles?id=eq.'+api.user().id,{method:'PATCH',body:JSON.stringify(data)});if(old&&old!==data.avatar_url)try{await api.removeUploads([old],null,true);}catch{api.photoCleanupPending=true;}},
  async publish(data){requireUser();data={...validateListing(data),...validateTechnical(data)};if(isDemo){const row={...data,id:uuid(),owner_id:'demo-me',owner_name:db.profile.display_name,active:true,blocked:[]};db.listings.unshift(row);save();return row;}const {art,color,...fields}=data;return (await post('listings',{...fields,owner_id:api.user().id}))[0];},
  async updateListing(id,data){requireUser();resourceId(id,isDemo);data={...validateListing(data),...validateTechnical(data)};if(isDemo){const row=db.listings.find(l=>l.id===id&&l.owner_id===api.user().id);if(!row)throw new Error('Annuncio non trovato.');Object.assign(row,data);save();return structuredClone(row);}const previous=(await api.myListings()).find(l=>l.id===id);const rows=await request('/rest/v1/listings?id=eq.'+encodeURIComponent(id)+'&owner_id=eq.'+api.user().id,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(data)});if(!rows?.length)throw new Error('Annuncio non trovato o permessi insufficienti.');try{await api.removeUploads((previous?.images||[]).filter(ref=>!data.images.includes(ref)));}catch{api.photoCleanupPending=true;}return rows[0];},
  async toggleListing(id,active){requireUser();resourceId(id,isDemo);if(isDemo){const l=db.listings.find(x=>x.id===id&&x.owner_id==='demo-me');if(!l)throw new Error('Annuncio non trovato.');l.active=active;save();return;}await request('/rest/v1/listings?id=eq.'+id+'&owner_id=eq.'+api.user().id,{method:'PATCH',body:JSON.stringify({active})});},
  async block(id,start_date,end_date){requireUser();resourceId(id,isDemo);validateRental(start_date,end_date);if(isDemo){const l=db.listings.find(x=>x.id===id&&x.owner_id==='demo-me');if(!l)throw new Error('Annuncio non trovato.');if(!available(l,start_date,end_date,db.bookings))throw new Error('Esiste già un blocco o un noleggio in queste date.');l.blocked.push({start_date,end_date});save();return;}await rpc('block_dates',{p_listing:id,p_start:start_date,p_end:end_date});},
  async unblock(id){requireUser();resourceId(id,isDemo);if(isDemo){db.listings.find(x=>x.id===id&&x.owner_id==='demo-me').blocked=[];save();return;}await rpc('clear_blocks',{p_listing:id});},
  async bookings(){requireUser();return isDemo?structuredClone(db.bookings):rest('bookings','?order=created_at.desc');},
  async createBooking(listing,start_date,end_date,note){requireUser();const days=validateRental(start_date,end_date);if(listing.owner_id===api.user().id)throw new Error('Non puoi prenotare la tua attrezzatura.');if(isDemo&&db.blocks.includes(listing.owner_id))throw new Error('Sblocca questo profilo prima di inviare una richiesta.');if(isDemo){listing=db.listings.find(l=>l.id===listing.id&&l.active);if(!listing)throw new Error('Annuncio non disponibile.');if(db.bookings.some(b=>b.listing_id===listing.id&&b.renter_id===api.user().id&&b.start_date===start_date&&b.end_date===end_date&&b.status==='requested'))throw new Error('Hai già inviato una richiesta per queste date.');if(!available(listing,start_date,end_date,db.bookings))throw new Error('Attrezzatura già impegnata in queste date.');const b={id:uuid(),listing_id:listing.id,owner_id:listing.owner_id,renter_id:'demo-me',renter_name:db.profile.display_name,title:listing.title,start_date,end_date,total:days*listing.price,deposit:listing.deposit,status:'requested',note,conditions:listing.conditions,insurance:listing.insurance,accessories:listing.accessories,created_at:new Date().toISOString()};db.bookings.unshift(b);if(note)db.messages.push({id:uuid(),booking_id:b.id,sender_id:'demo-me',body:note,created_at:new Date().toISOString()});save();return b;}return rpc('request_booking',{p_listing:listing.id,p_start:start_date,p_end:end_date,p_note:note});},
  async transition(id,status,note='',photos=[],checklist={}){if(['collected','returned','completed'].includes(status))checklist=validateChecklist(checklist);requireUser();resourceId(id,isDemo);if(isDemo){const b=db.bookings.find(x=>x.id===id);const owner=ownerFor(b)==='demo-me';if(!nextActions(b.status,owner).includes(status))throw new Error('Operazione non disponibile.');if(status==='accepted'&&!available(db.listings.find(x=>x.id===b.listing_id),b.start_date,b.end_date,db.bookings.filter(x=>x.id!==id)))throw new Error('Date già occupate.');b.status=status;db.evidence.push({id:uuid(),booking_id:id,stage:status,note,photos,checklist,created_at:new Date().toISOString()});save();return;}await rpc('transition_booking_checked',{p_booking:id,p_status:status,p_note:note,p_photos:photos,p_checklist:checklist});},
  async demoAccept(id){if(!isDemo)return;const b=db.bookings.find(x=>x.id===id);const l=db.listings.find(x=>x.id===b.listing_id);if(b.status!=='requested'||!available(l,b.start_date,b.end_date,db.bookings.filter(x=>x.id!==id)))throw new Error('Le date non sono disponibili.');b.status='accepted';if(db.blocks.includes(b.owner_id)){save();return;}db.messages.push({id:uuid(),booking_id:id,sender_id:b.owner_id,body:'[Simulazione] Richiesta accettata. Possiamo concordare qui il ritiro.',created_at:new Date().toISOString()});db.notifications.push({id:uuid(),user_id:'demo-me',booking_id:id,kind:'message',created_at:db.messages.at(-1).created_at,read_at:null});save();},
  async demoHandoff(id){if(!isDemo)return;const b=db.bookings.find(x=>x.id===id);if(b.status==='accepted')b.status='collected';else if(b.status==='returned')b.status='completed';else throw new Error('Passaggio demo non disponibile.');db.evidence.push({id:uuid(),booking_id:id,actor_id:b.owner_id,stage:b.status,note:'[Simulazione] Controlli confermati dal proprietario di esempio.',photos:[],checklist:{equipment:true,accessories:true,condition:true},created_at:new Date().toISOString()});save();},
  async chatThreads(){requireUser();const [bookings,inquiries]=isDemo?[db.bookings,db.inquiries]:await Promise.all([api.bookings(),rest('inquiries','?order=created_at.desc')]);return structuredClone([...bookings.map(b=>({...b,kind:'booking'})),...inquiries.map(q=>({...q,status:'question',kind:'inquiry'}))].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))));},
  async contactListing(listing,body){requireUser();body=String(body||'').trim();if(!body||body.length>2000)throw new Error('Scrivi un messaggio da 1 a 2000 caratteri.');if(isDemo){const l=db.listings.find(l=>l.id===listing.id&&l.active);if(!l||l.owner_id==='demo-me')throw new Error('Annuncio non disponibile.');if(db.blocks.includes(l.owner_id))throw new Error('Sblocca questo profilo prima di scrivergli.');let q=db.inquiries.find(q=>q.listing_id===l.id&&q.renter_id==='demo-me');if(!q){q={id:uuid(),listing_id:l.id,owner_id:l.owner_id,renter_id:'demo-me',title:l.title,created_at:new Date().toISOString()};db.inquiries.unshift(q);}db.messages.push({id:uuid(),conversation_id:q.id,sender_id:'demo-me',body,created_at:new Date().toISOString()});save();return q.id;}return rpc('contact_listing',{p_listing:listing.id,p_body:body});},
  async messages(id,kind='booking'){requireUser();resourceId(id,isDemo);const key=kind==='inquiry'?'conversation_id':'booking_id';return isDemo?structuredClone(db.messages.filter(m=>m[key]===id)):rest(kind==='inquiry'?'inquiry_messages':'messages','?'+key+'=eq.'+id+'&order=created_at.asc');},
  async send(id,body,kind='booking'){requireUser();resourceId(id,isDemo);body=body.trim();if(!body||body.length>2000)throw new Error('Scrivi un messaggio di massimo 2000 caratteri.');const key=kind==='inquiry'?'conversation_id':'booking_id';if(isDemo){const q=(kind==='inquiry'?db.inquiries:db.bookings).find(t=>t.id===id);if(!q)throw new Error('Conversazione non trovata.');if(db.blocks.includes(q.owner_id==='demo-me'?q.renter_id:q.owner_id))throw new Error('Questa conversazione non può ricevere messaggi.');db.messages.push({id:uuid(),[key]:id,sender_id:'demo-me',body,created_at:new Date().toISOString()});save();return;}await post(kind==='inquiry'?'inquiry_messages':'messages',{[key]:id,sender_id:api.user().id,body});},
  async reviews(id){resourceId(id,isDemo);if(isDemo)return structuredClone(db.reviews.filter(r=>r.reviewee_id===id).map(r=>({...r,reviewer:{display_name:db.profile.display_name,avatar_url:db.profile.avatar_url||''}})));return rest('rental_reviews','?reviewee_id=eq.'+id+'&select=id,rating,body,created_at,reviewer:profiles!rental_reviews_reviewer_id_fkey(display_name,avatar_url)&order=created_at.desc&limit=20');},
  async reputation(id){if(isDemo){const rows=db.reviews.filter(r=>r.reviewee_id===id);return {review_count:rows.length,average_rating:rows.length?rows.reduce((n,r)=>n+r.rating,0)/rows.length:null};}return (await rest('reputation_summary','?reviewee_id=eq.'+encodeURIComponent(id)))[0]||{review_count:0,average_rating:null};},
  async reviewedBookings(){requireUser();return isDemo?db.reviews.filter(r=>r.reviewer_id==='demo-me').map(r=>r.booking_id):rpc('my_reviewed_bookings',{});},
  async submitReview(id,rating,body){requireUser();resourceId(id,isDemo);const clean=validateReview(rating,body);if(isDemo){const b=db.bookings.find(b=>b.id===id&&b.status==='completed'&&[b.owner_id,b.renter_id].includes('demo-me'));if(!b)throw new Error('Puoi recensire soltanto un tuo noleggio concluso.');if(db.reviews.some(r=>r.booking_id===id&&r.reviewer_id==='demo-me'))throw new Error('Hai già recensito questo noleggio.');db.reviews.push({id:uuid(),booking_id:id,reviewer_id:'demo-me',reviewee_id:b.owner_id==='demo-me'?b.renter_id:b.owner_id,...clean,created_at:new Date().toISOString()});save();return;}await rpc('submit_review',{p_booking:id,p_rating:clean.rating,p_body:clean.body});},
  async safetySettings(){requireUser();if(isDemo)return {blocked:db.blocks.map(id=>({id,name:(sampleProfiles.find(p=>p.id===id)||{}).display_name||'Profilo'})),reports:db.reports,moderator:false};return rpc('safety_settings',{});},
  async setBlock(id,blocked){requireUser();resourceId(id,isDemo);if(id===api.user().id)throw new Error('Non puoi bloccare il tuo profilo.');if(isDemo){if(!sampleProfiles.some(p=>p.id===id))throw new Error('Profilo non disponibile.');db.blocks=blocked?[...new Set([...db.blocks,id])]:db.blocks.filter(x=>x!==id);save();return;}await rpc('set_user_block',{p_user:id,p_blocked:Boolean(blocked)});},
  async submitReport(id,reason,details,context={}){requireUser();resourceId(id,isDemo);details=String(details||'').trim();if(id===api.user().id||!reportReasons.includes(reason)||details.length<10||details.length>2000)throw new Error('Controlla il motivo e la descrizione della segnalazione.');if(isDemo){const p=sampleProfiles.find(p=>p.id===id);if(!p)throw new Error('Profilo non disponibile.');db.reports.push({id:uuid(),name:p.display_name,reported_id:id,reason,details,status:'open',created_at:new Date().toISOString()});save();return;}await rpc('submit_report',{p_user:id,p_reason:reason,p_details:details,p_listing:context.listing||null,p_booking:context.booking||null,p_conversation:context.conversation||null});},
  async moderationQueue(){requireUser();if(isDemo)throw new Error('La demo non ha moderatori reali.');return rpc('moderation_queue',{});},
  async resolveReport(id,status,note){requireUser();if(isDemo)throw new Error('La demo non ha moderatori reali.');await rpc('resolve_report',{p_report:id,p_status:status,p_note:note});},
  async evidence(id){requireUser();resourceId(id,isDemo);return isDemo?structuredClone(db.evidence.filter(e=>e.booking_id===id)):rest('handoffs','?booking_id=eq.'+id+'&order=created_at.asc');},
  async notificationCounts(){requireUser();if(!isDemo)return rpc('notification_counts',{});const unread=db.notifications.filter(n=>n.user_id===api.user().id&&!n.read_at);const byBooking={};for(const n of unread)if(n.kind==='message')byBooking[n.booking_id||n.conversation_id]=(byBooking[n.booking_id||n.conversation_id]||0)+1;return {messages:unread.filter(n=>n.kind==='message').length,requests:unread.filter(n=>n.kind==='request').length,byBooking};},
  async readNotifications(id,kind,through,threadKind='booking'){requireUser();resourceId(id,isDemo);if(!['message','request'].includes(kind)||!Number.isFinite(Date.parse(through)))throw new Error('Lettura non valida.');if(isDemo){for(const n of db.notifications)if(n.user_id===api.user().id&&(n.booking_id===id||n.conversation_id===id)&&n.kind===kind&&n.created_at<=through)n.read_at=new Date().toISOString();save();return;}if(threadKind==='inquiry')await rpc('read_inquiry_notifications',{p_conversation:id,p_through:through});else await rpc('read_notifications',{p_booking:id,p_kind:kind,p_through:through});},
  async pushConfig(){requireUser();return isDemo?{}:rpc('get_push_config',{});},
  async pushStatus(endpoint){requireUser();return isDemo?{enabled:false}:rpc('push_status',{p_endpoint:endpoint});},
  async savePushSubscription(data){requireUser();if(isDemo)throw new Error('Le notifiche tra utenti richiedono un account del pilota.');return rpc('save_push_subscription',{p_endpoint:data.endpoint,p_p256dh:data.p256dh,p_auth:data.auth,p_messages:Boolean(data.messages),p_requests:Boolean(data.requests)});},
  async removePushSubscription(endpoint){requireUser();if(!isDemo)await rpc('remove_push_subscription',{p_endpoint:endpoint});},
  async upload(file,privateBooking=null,avatar=false){requireUser();if(file.type!=='image/jpeg'||file.size>PHOTO_MAX_BYTES)throw new Error('Prepara le foto prima del caricamento (JPG, massimo 500 KB).');if(isDemo){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Impossibile leggere la foto.'));r.readAsDataURL(file);});}const bucket=avatar?'profile-photos':privateBooking?'handoff-photos':'listing-photos';const path=api.user().id+'/'+(privateBooking?privateBooking+'/':'')+uuid()+'.jpg';await request('/storage/v1/object/'+bucket+'/'+path,{method:'POST',headers:{'Content-Type':file.type,'Cache-Control':'max-age=3600'},body:file});return privateBooking?path:config.url+'/storage/v1/object/public/'+bucket+'/'+path;},
  async removeUploads(refs,privateBooking=null,avatar=false){if(isDemo||!refs.length)return;requireUser();const bucket=avatar?'profile-photos':privateBooking?'handoff-photos':'listing-photos';const prefix=config.url+'/storage/v1/object/public/'+bucket+'/';const paths=refs.map(ref=>privateBooking?ref:ref.startsWith(prefix)?ref.slice(prefix.length):'');if(paths.some(path=>!path.startsWith(api.user().id+'/')||path.includes('..')))throw new Error('Foto non appartenente al tuo account.');await request('/storage/v1/object/'+bucket,{method:'DELETE',body:JSON.stringify({prefixes:paths})});},
  async photoUrl(path){if(isDemo)return path;if(typeof path!=='string'||!/^([a-f0-9-]{36}\/){2}[a-f0-9-]{36}\.jpg$/.test(path))throw new Error('Foto non disponibile.');const r=await request('/storage/v1/object/sign/handoff-photos/'+path,{method:'POST',body:JSON.stringify({expiresIn:300})});if(typeof r.signedURL!=='string'||!r.signedURL.startsWith('/object/sign/handoff-photos/'))throw new Error('Foto non disponibile.');return config.url+'/storage/v1'+r.signedURL;},
  async eraseAccount(password){requireUser();if(isDemo){await api.requestErasure();return {status:'review',demo:true};}const result=await request('/functions/v1/account-erasure',{method:'POST',body:JSON.stringify({password:validPassword(password),confirmation:'ELIMINA'})});if(result.status==='queued'){storeSession(null);localStorage.removeItem(PKCE_KEY);localStorage.removeItem('sic-favorites');}return result;},
  async privacyRequests(){requireUser();return isDemo?structuredClone(db.privacyRequests):rpc('my_privacy_requests',{});},
  async requestErasure(){requireUser();if(!isDemo)return rpc('request_erasure',{});let r=db.privacyRequests.find(r=>['open','reviewing'].includes(r.status));if(!r){r={id:uuid(),status:'open',created_at:new Date().toISOString(),response:''};db.privacyRequests.push(r);save();}return r.id;},
  async erasureQueue(){requireUser();if(isDemo)return [];return rpc('account_erasure_queue',{});},
  async privacyQueue(){requireUser();if(isDemo)throw new Error('Nessun gestore reale nella demo.');return rpc('privacy_queue',{});},
  async respondPrivacy(id,status,response){requireUser();resourceId(id,isDemo);return rpc('respond_privacy_request',{p_request:id,p_status:status,p_response:response});},
  async exportData(){requireUser();if(!isDemo)return {...await rpc('export_my_data',{}),account_email:api.user().email};return {exported_at:new Date().toISOString(),demo:true,profile:await api.profile(),listings:await api.myListings(),bookings:await api.bookings(),messages:structuredClone(db.messages),evidence:structuredClone(db.evidence),reviews:structuredClone(db.reviews),privacy_requests:await api.privacyRequests()};},
  async unusedUploads(){requireUser();return isDemo?[]:rpc('unused_uploads',{});},
  async cleanUnusedUploads(){requireUser();const rows=await api.unusedUploads();for(const bucket of ['profile-photos','listing-photos','handoff-photos']){const paths=rows.filter(r=>r.bucket===bucket).map(r=>r.path);if(paths.some(p=>!p.startsWith(api.user().id+'/')||p.includes('..')))throw new Error('Percorso foto non valido.');if(paths.length)await request('/storage/v1/object/'+bucket,{method:'DELETE',body:JSON.stringify({prefixes:paths})});}const remaining=await api.unusedUploads();if(remaining.length)throw new Error('Alcuni file non sono stati eliminati. Riprova la pulizia più tardi.');api.photoCleanupPending=false;return rows.length;},
  resetDemo(){if(!isDemo)return;for(const key of [DEMO_KEY,'sic-favorites',PKCE_KEY])localStorage.removeItem(key);sessionStorage.removeItem(SESSION_KEY);location.reload();}
};
