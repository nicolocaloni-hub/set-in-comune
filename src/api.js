import rawConfig from './config.js';
import {validatePublicConfig,validEmail,validPassword,resourceId} from './security.js';
const config=validatePublicConfig(rawConfig.url,rawConfig.key);
import {sampleListings,sampleProfiles} from './data.js';
import {available,validateRental,nextActions,validateListing} from './domain.js';
import {PHOTO_MAX_BYTES} from './photos.js';
export const isDemo = !config.url || !config.key;
const uuid=()=>{if(crypto.randomUUID)return crypto.randomUUID();const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=[...b].map(x=>x.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;};
const SESSION_KEY='sic-session-v2', PKCE_KEY='sic-pkce-v1', DEMO_KEY='sic-demo-v1';
function read(key,fallback,storage=localStorage) {try{return JSON.parse(storage.getItem(key)) || fallback;}catch{return fallback;}}
let session=read(SESSION_KEY,null,globalThis.sessionStorage);
let db=read(DEMO_KEY,{listings:sampleListings,bookings:[],messages:[],evidence:[],profile:{display_name:'Il tuo profilo demo',bio:'Filmmaker a Roma',zone:'Prati'}});
let savedDemo = JSON.stringify(db);
const save=()=>{const json=JSON.stringify(db);try{localStorage.setItem(DEMO_KEY,json);savedDemo=json;}catch{db=JSON.parse(savedDemo);throw new Error('Spazio della demo esaurito su questo browser. Rimuovi alcune foto dai tuoi annunci o ripristina la demo dal Profilo. Nessun piano a pagamento viene attivato.');}};
const storeSession=value=>{if(value){value={...value,expires_at:value.expires_at??(Number.isFinite(value.expires_in)?Math.floor(Date.now()/1000)+value.expires_in:NaN)};if(!value.access_token||!value.refresh_token||!value.user?.id||!Number.isFinite(value.expires_at))throw new Error('Risposta di accesso non valida. Riprova.');sessionStorage.setItem(SESSION_KEY,JSON.stringify(value));}else sessionStorage.removeItem(SESSION_KEY);session=value;};
let refreshPromise;
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
const redirectPath=path=>path+'?redirect_to='+encodeURIComponent(location.origin+location.pathname);
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
  if(!res.ok){if(res.status===401){storeSession(null);throw new Error('La sessione è scaduta. Accedi di nuovo.');}if(res.status===403)throw new Error('Non hai accesso a questa operazione.');if(res.status===429)throw new Error('Troppi tentativi. Attendi e riprova.');if(data?.code==='23505')throw new Error('Questa richiesta è già presente.');throw new Error(data?.code==='P0001'?data.message:'Operazione non riuscita. Controlla i dati e riprova.');}
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
    // Drop old persistent bearer tokens; the new session lives only in this tab.
    localStorage.removeItem('sic-session-v1');
    const url=new URL(location.href),fragment=new URLSearchParams(url.hash.slice(1));
    const code=url.searchParams.get('code');let recovery=false;
    if(code||fragment.has('access_token')||url.searchParams.has('error')||fragment.has('error')){
      url.searchParams.delete('code');url.searchParams.delete('error');url.searchParams.delete('error_code');url.searchParams.delete('error_description');url.hash='profile';
      history.replaceState(null,'',url.pathname+url.search+url.hash);
      if(!code)throw new Error('Richiedi un nuovo link e aprilo nello stesso browser usato per la richiesta.');
      const flow=read(PKCE_KEY,null);
      localStorage.removeItem(PKCE_KEY);
      if(!flow||!flow.verifier||!Number.isFinite(flow.created_at)||flow.created_at>Date.now()+5000||Date.now()-flow.created_at>3600000)throw new Error('Richiedi un nuovo link e aprilo nello stesso browser usato per la richiesta.');
      const result=await auth('token?grant_type=pkce',{auth_code:code,code_verifier:flow.verifier});
      storeSession(result);recovery=flow.purpose==='recovery';
    }
    if(session){try{await token();const user=await request('/auth/v1/user');storeSession({...session,user});}catch(e){storeSession(null);throw e;}}
    return recovery;
  },
  async changePassword(password){await request('/auth/v1/user',{method:'PUT',body:JSON.stringify({password:validPassword(password)})});},
  async login(email,password){storeSession(await auth('token?grant_type=password',{email:validEmail(email),password:validPassword(password)}));},
  async signup(email,password,display_name){const name=String(display_name||'').trim();if(name.length<2||name.length>60)throw new Error('Inserisci un nome tra 2 e 60 caratteri.');const params=await startPkce('signup');const s=await auth(redirectPath('signup'),{email:validEmail(email),password:validPassword(password),data:{display_name:name},...params});if(s.access_token)storeSession(s);return Boolean(s.access_token);},
  async reset(email){const params=await startPkce('recovery');await auth(redirectPath('recover'),{email:validEmail(email),...params});},
  async logout(){if(!isDemo&&session){try{await request('/auth/v1/logout',{method:'POST'});}finally{storeSession(null);localStorage.removeItem(PKCE_KEY);}}},
  async listings(){
    if(isDemo)return structuredClone(db.listings.filter(x=>x.active).map(l=>({...l,blocked:[...l.blocked,...db.bookings.filter(b=>b.listing_id===l.id&&['accepted','collected','returned'].includes(b.status)).map(b=>({start_date:b.start_date,end_date:b.end_date}))]})));
    const [items,periods]=await Promise.all([rest('listings','?active=eq.true&order=created_at.desc'),rest('listing_availability')]);
    return items.map(l=>({...l,blocked:[...l.blocked,...periods.filter(p=>p.listing_id===l.id)]}));
  },
  async myListings(){requireUser();return isDemo?structuredClone(db.listings.filter(x=>x.owner_id==='demo-me')):rest('listings','?owner_id=eq.'+api.user().id+'&order=created_at.desc');},
  async profile(){requireUser();if(isDemo)return structuredClone(db.profile);return (await rest('profiles','?id=eq.'+api.user().id))[0];},
  async publicProfile(id){if(isDemo){if(id==='demo-me')return structuredClone({...db.profile,id,email_verified:false});const p=sampleProfiles.find(p=>p.id===id);if(!p)throw new Error('Profilo non disponibile.');return structuredClone(p);}const rows=await rest('profiles','?id=eq.'+encodeURIComponent(id)+'&select=id,display_name,bio,zone,avatar_url,email_verified,created_at');if(!rows.length)throw new Error('Profilo non disponibile.');return rows[0];},
  async publicListings(id){if(isDemo)return (await api.listings()).filter(l=>l.owner_id===id);return rest('listings','?owner_id=eq.'+encodeURIComponent(id)+'&active=eq.true&order=created_at.desc');},
  async saveProfile(data){requireUser();data=Object.fromEntries(['display_name','bio','zone','avatar_url'].filter(k=>Object.hasOwn(data,k)).map(k=>[k,data[k]]));if(Object.hasOwn(data,'display_name')&&(data.display_name.trim().length<2||data.display_name.trim().length>60))throw new Error('Inserisci un nome tra 2 e 60 caratteri.');if(isDemo){Object.assign(db.profile,data);db.listings.filter(l=>l.owner_id==='demo-me').forEach(l=>l.owner_name=db.profile.display_name);save();return;}await request('/rest/v1/profiles?id=eq.'+api.user().id,{method:'PATCH',body:JSON.stringify(data)});},
  async publish(data){requireUser();data=validateListing(data);if(isDemo){const row={...data,id:uuid(),owner_id:'demo-me',owner_name:db.profile.display_name,active:true,blocked:[]};db.listings.unshift(row);save();return row;}const {art,color,...fields}=data;return (await post('listings',{...fields,owner_id:api.user().id}))[0];},
  async updateListing(id,data){requireUser();resourceId(id,isDemo);data=validateListing(data);if(isDemo){const row=db.listings.find(l=>l.id===id&&l.owner_id===api.user().id);if(!row)throw new Error('Annuncio non trovato.');Object.assign(row,data);save();return structuredClone(row);}const rows=await request('/rest/v1/listings?id=eq.'+encodeURIComponent(id)+'&owner_id=eq.'+api.user().id,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(data)});if(!rows?.length)throw new Error('Annuncio non trovato o permessi insufficienti.');return rows[0];},
  async toggleListing(id,active){requireUser();resourceId(id,isDemo);if(isDemo){const l=db.listings.find(x=>x.id===id&&x.owner_id==='demo-me');if(!l)throw new Error('Annuncio non trovato.');l.active=active;save();return;}await request('/rest/v1/listings?id=eq.'+id+'&owner_id=eq.'+api.user().id,{method:'PATCH',body:JSON.stringify({active})});},
  async block(id,start_date,end_date){requireUser();resourceId(id,isDemo);validateRental(start_date,end_date);if(isDemo){const l=db.listings.find(x=>x.id===id&&x.owner_id==='demo-me');if(!l)throw new Error('Annuncio non trovato.');if(!available(l,start_date,end_date,db.bookings))throw new Error('Esiste già un blocco o un noleggio in queste date.');l.blocked.push({start_date,end_date});save();return;}await rpc('block_dates',{p_listing:id,p_start:start_date,p_end:end_date});},
  async unblock(id){requireUser();resourceId(id,isDemo);if(isDemo){db.listings.find(x=>x.id===id&&x.owner_id==='demo-me').blocked=[];save();return;}await rpc('clear_blocks',{p_listing:id});},
  async bookings(){requireUser();return isDemo?structuredClone(db.bookings):rest('bookings','?order=created_at.desc');},
  async createBooking(listing,start_date,end_date,note){requireUser();const days=validateRental(start_date,end_date);if(listing.owner_id===api.user().id)throw new Error('Non puoi prenotare la tua attrezzatura.');if(isDemo){listing=db.listings.find(l=>l.id===listing.id&&l.active);if(!listing)throw new Error('Annuncio non disponibile.');if(db.bookings.some(b=>b.listing_id===listing.id&&b.renter_id===api.user().id&&b.start_date===start_date&&b.end_date===end_date&&b.status==='requested'))throw new Error('Hai già inviato una richiesta per queste date.');if(!available(listing,start_date,end_date,db.bookings))throw new Error('Attrezzatura già impegnata in queste date.');const b={id:uuid(),listing_id:listing.id,owner_id:listing.owner_id,renter_id:'demo-me',renter_name:db.profile.display_name,title:listing.title,start_date,end_date,total:days*listing.price,deposit:listing.deposit,status:'requested',note,conditions:listing.conditions,insurance:listing.insurance,accessories:listing.accessories,created_at:new Date().toISOString()};db.bookings.unshift(b);if(note)db.messages.push({id:uuid(),booking_id:b.id,sender_id:'demo-me',body:note,created_at:new Date().toISOString()});save();return b;}return rpc('request_booking',{p_listing:listing.id,p_start:start_date,p_end:end_date,p_note:note});},
  async transition(id,status,note='',photos=[]){requireUser();resourceId(id,isDemo);if(isDemo){const b=db.bookings.find(x=>x.id===id);const owner=ownerFor(b)==='demo-me';if(!nextActions(b.status,owner).includes(status))throw new Error('Operazione non disponibile.');if(status==='accepted'&&!available(db.listings.find(x=>x.id===b.listing_id),b.start_date,b.end_date,db.bookings.filter(x=>x.id!==id)))throw new Error('Date già occupate.');b.status=status;db.evidence.push({id:uuid(),booking_id:id,stage:status,note,photos,created_at:new Date().toISOString()});save();return;}await rpc('transition_booking',{p_booking:id,p_status:status,p_note:note,p_photos:photos});},
  async demoAccept(id){if(!isDemo)return;const b=db.bookings.find(x=>x.id===id);const l=db.listings.find(x=>x.id===b.listing_id);if(b.status!=='requested'||!available(l,b.start_date,b.end_date,db.bookings.filter(x=>x.id!==id)))throw new Error('Le date non sono disponibili.');b.status='accepted';db.messages.push({id:uuid(),booking_id:id,sender_id:b.owner_id,body:'[Simulazione] Richiesta accettata. Possiamo concordare qui il ritiro.',created_at:new Date().toISOString()});save();},
  async demoHandoff(id){if(!isDemo)return;const b=db.bookings.find(x=>x.id===id);if(b.status==='accepted')b.status='collected';else if(b.status==='returned')b.status='completed';save();},
  async messages(id){requireUser();resourceId(id,isDemo);return isDemo?structuredClone(db.messages.filter(m=>m.booking_id===id)):rest('messages','?booking_id=eq.'+id+'&order=created_at.asc');},
  async send(id,body){requireUser();resourceId(id,isDemo);body=body.trim();if(!body||body.length>2000)throw new Error('Scrivi un messaggio di massimo 2000 caratteri.');if(isDemo){db.messages.push({id:uuid(),booking_id:id,sender_id:'demo-me',body,created_at:new Date().toISOString()});save();return;}await post('messages',{booking_id:id,sender_id:api.user().id,body});},
  async evidence(id){requireUser();resourceId(id,isDemo);return isDemo?structuredClone(db.evidence.filter(e=>e.booking_id===id)):rest('handoffs','?booking_id=eq.'+id+'&order=created_at.asc');},
  async upload(file,privateBooking=null,avatar=false){requireUser();if(file.type!=='image/jpeg'||file.size>PHOTO_MAX_BYTES)throw new Error('Prepara le foto prima del caricamento (JPG, massimo 500 KB).');if(isDemo){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Impossibile leggere la foto.'));r.readAsDataURL(file);});}const bucket=avatar?'profile-photos':privateBooking?'handoff-photos':'listing-photos';const path=api.user().id+'/'+(privateBooking?privateBooking+'/':'')+uuid()+'.jpg';await request('/storage/v1/object/'+bucket+'/'+path,{method:'POST',headers:{'Content-Type':file.type,'Cache-Control':'max-age=3600'},body:file});return privateBooking?path:config.url+'/storage/v1/object/public/'+bucket+'/'+path;},
  async removeUploads(refs,privateBooking=null,avatar=false){if(isDemo||!refs.length)return;requireUser();const bucket=avatar?'profile-photos':privateBooking?'handoff-photos':'listing-photos';const prefix=config.url+'/storage/v1/object/public/'+bucket+'/';const paths=refs.map(ref=>privateBooking?ref:ref.startsWith(prefix)?ref.slice(prefix.length):'');if(paths.some(path=>!path.startsWith(api.user().id+'/')||path.includes('..')))throw new Error('Foto non appartenente al tuo account.');await request('/storage/v1/object/'+bucket,{method:'DELETE',body:JSON.stringify({prefixes:paths})});},
  async photoUrl(path){if(isDemo)return path;if(typeof path!=='string'||!/^([a-f0-9-]{36}\/){2}[a-f0-9-]{36}\.jpg$/.test(path))throw new Error('Foto non disponibile.');const r=await request('/storage/v1/object/sign/handoff-photos/'+path,{method:'POST',body:JSON.stringify({expiresIn:300})});if(typeof r.signedURL!=='string'||!r.signedURL.startsWith('/object/sign/handoff-photos/'))throw new Error('Foto non disponibile.');return config.url+'/storage/v1'+r.signedURL;},
  resetDemo(){if(!isDemo)return;localStorage.removeItem(DEMO_KEY);location.reload();}
};
