import config from './config.js';
import {sampleListings} from './data.js';
import {available,validateRental,nextActions} from './domain.js';
export const isDemo = !config.url || !config.key;
const uuid=()=>{if(crypto.randomUUID)return crypto.randomUUID();const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=[...b].map(x=>x.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;};
const SESSION_KEY='sic-session-v1', DEMO_KEY='sic-demo-v1';
function read(key,fallback) {try{return JSON.parse(localStorage.getItem(key)) || fallback;}catch{return fallback;}}
let session=read(SESSION_KEY,null);
let db=read(DEMO_KEY,{listings:sampleListings,bookings:[],messages:[],evidence:[],profile:{display_name:'Il tuo profilo demo',bio:'Filmmaker a Roma',zone:'Prati'}});
const save=()=>localStorage.setItem(DEMO_KEY,JSON.stringify(db));
const storeSession=value=>{ session=value; if(value)localStorage.setItem(SESSION_KEY,JSON.stringify(value));else localStorage.removeItem(SESSION_KEY); };
let refreshPromise;
async function auth(path,body) {
  const res=await fetch(config.url+'/auth/v1/'+path,{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const result=await res.json();
  if(!res.ok) throw new Error(result.msg || result.error_description || result.message || 'Accesso non riuscito.');
  return result;
}
async function token() {
  if(!session) return config.key;
  if(session.expires_at*1000 < Date.now()+60000) {
    refreshPromise ||= auth('token?grant_type=refresh_token',{refresh_token:session.refresh_token}).then(s=>{storeSession(s);return s.access_token;}).catch(e=>{storeSession(null);throw e;}).finally(()=>refreshPromise=null);
    return refreshPromise;
  }
  return session.access_token;
}
async function request(path, options={}) {
  const res=await fetch(config.url+path,{...options,headers:{apikey:config.key,Authorization:'Bearer '+await token(),'Content-Type':'application/json',...options.headers}});
  const raw=await res.text();let data;try{data=raw?JSON.parse(raw):null;}catch{data=null;}
  if(!res.ok) throw new Error(data?.message || data?.msg || 'Operazione non riuscita. Riprova tra poco.');
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
    const params=new URLSearchParams(location.hash.slice(1));
    let recovery=false;
    if(params.has('access_token')){
      const access_token=params.get('access_token');
      const res=await fetch(config.url+'/auth/v1/user',{headers:{apikey:config.key,Authorization:'Bearer '+access_token}});
      if(!res.ok)throw new Error('Link scaduto. Richiedi un nuovo link di accesso.');
      const user=await res.json();
      storeSession({access_token,refresh_token:params.get('refresh_token'),expires_at:Math.floor(Date.now()/1000)+Number(params.get('expires_in')||3600),user});
      recovery=params.get('type')==='recovery';
      history.replaceState(null,'',location.pathname+'#profile');
    }
    if(session)await token();
    return recovery;
  },
  async changePassword(password){await request('/auth/v1/user',{method:'PUT',body:JSON.stringify({password})});},
  async login(email,password){storeSession(await auth('token?grant_type=password',{email,password}));},
  async signup(email,password,display_name){const s=await auth('signup',{email,password,data:{display_name}});if(s.access_token)storeSession(s);return Boolean(s.access_token);},
  async reset(email){await auth('recover',{email});},
  async logout(){if(!isDemo&&session){try{await request('/auth/v1/logout',{method:'POST'});}finally{storeSession(null);}}},
  async listings(){
    if(isDemo)return structuredClone(db.listings.filter(x=>x.active).map(l=>({...l,blocked:[...l.blocked,...db.bookings.filter(b=>b.listing_id===l.id&&['accepted','collected','returned'].includes(b.status)).map(b=>({start_date:b.start_date,end_date:b.end_date}))]})));
    const [items,periods]=await Promise.all([rest('listings','?active=eq.true&order=created_at.desc'),rest('listing_availability')]);
    return items.map(l=>({...l,blocked:[...l.blocked,...periods.filter(p=>p.listing_id===l.id)]}));
  },
  async myListings(){requireUser();return isDemo?structuredClone(db.listings.filter(x=>x.owner_id==='demo-me')):rest('listings','?owner_id=eq.'+api.user().id+'&order=created_at.desc');},
  async profile(){requireUser();if(isDemo)return structuredClone(db.profile);return (await rest('profiles','?id=eq.'+api.user().id))[0];},
  async saveProfile(data){requireUser();if(isDemo){db.profile=data;db.listings.filter(l=>l.owner_id==='demo-me').forEach(l=>l.owner_name=data.display_name);save();return;}await request('/rest/v1/profiles?id=eq.'+api.user().id,{method:'PATCH',body:JSON.stringify(data)});},
  async publish(data){requireUser();if(isDemo){const row={...data,id:uuid(),owner_id:'demo-me',owner_name:db.profile.display_name,active:true,blocked:[]};db.listings.unshift(row);save();return row;}const {art,color,...fields}=data;return (await post('listings',{...fields,owner_id:api.user().id}))[0];},
  async toggleListing(id,active){requireUser();if(isDemo){const l=db.listings.find(x=>x.id===id&&x.owner_id==='demo-me');if(!l)throw new Error('Annuncio non trovato.');l.active=active;save();return;}await request('/rest/v1/listings?id=eq.'+id+'&owner_id=eq.'+api.user().id,{method:'PATCH',body:JSON.stringify({active})});},
  async block(id,start_date,end_date){requireUser();validateRental(start_date,end_date);if(isDemo){const l=db.listings.find(x=>x.id===id&&x.owner_id==='demo-me');if(!l)throw new Error('Annuncio non trovato.');l.blocked.push({start_date,end_date});save();return;}await rpc('block_dates',{p_listing:id,p_start:start_date,p_end:end_date});},
  async unblock(id){requireUser();if(isDemo){db.listings.find(x=>x.id===id&&x.owner_id==='demo-me').blocked=[];save();return;}await rpc('clear_blocks',{p_listing:id});},
  async bookings(){requireUser();return isDemo?structuredClone(db.bookings):rest('bookings','?order=created_at.desc');},
  async createBooking(listing,start_date,end_date,note){requireUser();const days=validateRental(start_date,end_date);if(listing.owner_id===api.user().id)throw new Error('Non puoi prenotare la tua attrezzatura.');if(isDemo){if(!available(listing,start_date,end_date,db.bookings))throw new Error('Attrezzatura già impegnata in queste date.');const b={id:uuid(),listing_id:listing.id,owner_id:listing.owner_id,renter_id:'demo-me',renter_name:db.profile.display_name,title:listing.title,start_date,end_date,total:days*listing.price,deposit:listing.deposit,status:'requested',note,conditions:listing.conditions,insurance:listing.insurance,accessories:listing.accessories,created_at:new Date().toISOString()};db.bookings.unshift(b);if(note)db.messages.push({id:uuid(),booking_id:b.id,sender_id:'demo-me',body:note,created_at:new Date().toISOString()});save();return b;}return rpc('request_booking',{p_listing:listing.id,p_start:start_date,p_end:end_date,p_note:note});},
  async transition(id,status,note='',photos=[]){requireUser();if(isDemo){const b=db.bookings.find(x=>x.id===id);const owner=ownerFor(b)==='demo-me';if(!nextActions(b.status,owner).includes(status))throw new Error('Operazione non disponibile.');if(status==='accepted'&&!available(db.listings.find(x=>x.id===b.listing_id),b.start_date,b.end_date,db.bookings.filter(x=>x.id!==id)))throw new Error('Date già occupate.');b.status=status;db.evidence.push({id:uuid(),booking_id:id,stage:status,note,photos,created_at:new Date().toISOString()});save();return;}await rpc('transition_booking',{p_booking:id,p_status:status,p_note:note,p_photos:photos});},
  async demoAccept(id){if(!isDemo)return;const b=db.bookings.find(x=>x.id===id);const l=db.listings.find(x=>x.id===b.listing_id);if(b.status!=='requested'||!available(l,b.start_date,b.end_date,db.bookings.filter(x=>x.id!==id)))throw new Error('Le date non sono disponibili.');b.status='accepted';db.messages.push({id:uuid(),booking_id:id,sender_id:b.owner_id,body:'[Simulazione] Richiesta accettata. Possiamo concordare qui il ritiro.',created_at:new Date().toISOString()});save();},
  async demoHandoff(id){if(!isDemo)return;const b=db.bookings.find(x=>x.id===id);if(b.status==='accepted')b.status='collected';else if(b.status==='returned')b.status='completed';save();},
  async messages(id){requireUser();return isDemo?structuredClone(db.messages.filter(m=>m.booking_id===id)):rest('messages','?booking_id=eq.'+id+'&order=created_at.asc');},
  async send(id,body){requireUser();body=body.trim();if(!body||body.length>2000)throw new Error('Scrivi un messaggio di massimo 2000 caratteri.');if(isDemo){db.messages.push({id:uuid(),booking_id:id,sender_id:'demo-me',body,created_at:new Date().toISOString()});save();return;}await post('messages',{booking_id:id,sender_id:api.user().id,body});},
  async evidence(id){requireUser();return isDemo?structuredClone(db.evidence.filter(e=>e.booking_id===id)):rest('handoffs','?booking_id=eq.'+id+'&order=created_at.asc');},
  async upload(file,privateBooking=null){requireUser();if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Usa foto JPG, PNG o WebP.');if(file.size>5*1024*1024)throw new Error('Ogni foto può pesare al massimo 5 MB.');if(isDemo){if(file.size>650000)throw new Error('Nella demo usa foto sotto 650 KB.');return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});}const bucket=privateBooking?'handoff-photos':'listing-photos';const path=api.user().id+'/'+(privateBooking?privateBooking+'/':'')+uuid()+'.'+({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type]);await request('/storage/v1/object/'+bucket+'/'+path,{method:'POST',headers:{'Content-Type':file.type},body:file});return privateBooking?path:config.url+'/storage/v1/object/public/'+bucket+'/'+path;},
  async photoUrl(path){if(isDemo||path.startsWith('https://'))return path;const r=await request('/storage/v1/object/sign/handoff-photos/'+path,{method:'POST',body:JSON.stringify({expiresIn:300})});return config.url+'/storage/v1'+r.signedURL;},
  resetDemo(){if(!isDemo)return;localStorage.removeItem(DEMO_KEY);location.reload();}
};
