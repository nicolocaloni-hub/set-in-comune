const supabaseOrigin = /^https:\/\/[a-z0-9-]+\.supabase\.co$/;
export function validatePublicConfig(url='',key='') {
  if (!url && !key) return {url:'',key:''};
  if (!url || !key || !supabaseOrigin.test(url)) throw new Error('Configure a Supabase HTTPS origin and its public key. Paths, credentials and query strings are not allowed.');
  if (/^sb_publishable_[A-Za-z0-9_-]{16,200}$/.test(key)) return {url,key};
  try {
    if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(key) || key.length>4096) throw new Error();
    const payload=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
    if (payload.role!=='anon') throw new Error();
    return {url,key};
  } catch { throw new Error('Only a Supabase publishable key or legacy anon key may be sent to the browser.'); }
}
export function safePhotoUrl(value,{origin,backend='',demo=false}={}) {
  if(typeof value!=='string'||!value||value.length>750000)return '';
  if(demo&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value))return value;
  try {
    const url=new URL(value);
    if(url.protocol==='blob:'&&url.origin===origin)return value;
    if(!backend||url.origin!==backend||url.username||url.password||url.protocol!=='https:')return '';
    if(!/^\/storage\/v1\/object\/(public\/(listing-photos|profile-photos)|sign\/handoff-photos)\/[a-f0-9-]+\/(?:[a-f0-9-]+\/)?[a-f0-9-]+\.jpg$/.test(url.pathname))return '';
    return value;
  }catch{return '';}
}
export function validEmail(value) {
  const email=String(value??'').trim();
  if(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Inserisci un indirizzo email valido.');
  return email;
}
export function validPassword(value) {
  if(typeof value!=='string'||value.length<10||value.length>128)throw new Error('Usa una password tra 10 e 128 caratteri.');
  return value;
}
export function resourceId(value,demo=false) {
  if(typeof value!=='string'||!(demo?/^(?:demo-[\w-]+|[a-f0-9-]{36})$/:/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i).test(value))throw new Error('Riferimento non valido.');
  return encodeURIComponent(value);
}
