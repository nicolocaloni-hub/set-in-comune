// "Aggiungi alla Home" guide: shown on the first signed-in open, then again every
// 10 further opens, until the person installs the app or taps "Già fatto".
export const INSTALL_KEY='sic-install-v1';
const EVERY=10;

export function nextInstallState(record,{installed=false,mobile=true}={}){
 const r={opens:Number.isInteger(record?.opens)&&record.opens>=0?record.opens:0,lastShown:Number.isInteger(record?.lastShown)?record.lastShown:null,done:record?.done===true};
 if(r.done||installed)return {record:{...r,done:r.done||installed},show:false};
 r.opens+=1;
 const show=mobile&&(r.lastShown===null||r.opens-r.lastShown>=EVERY);
 if(show)r.lastShown=r.opens;
 return {record:r,show};
}

export function countInstallOpen(env=globalThis){
 try{
  const nav=env.navigator||{};
  const installed=Boolean(nav.standalone||env.matchMedia?.('(display-mode: standalone)').matches);
  const mobile=/iPhone|iPad|iPod|Android/i.test(nav.userAgent||'')||(nav.platform==='MacIntel'&&nav.maxTouchPoints>1);
  const {record,show}=nextInstallState(JSON.parse(env.localStorage.getItem(INSTALL_KEY)||'null'),{installed,mobile});
  env.localStorage.setItem(INSTALL_KEY,JSON.stringify(record));
  return show;
 }catch{return false;}
}

export function markInstalled(env=globalThis){
 try{const r=JSON.parse(env.localStorage.getItem(INSTALL_KEY)||'null')||{};env.localStorage.setItem(INSTALL_KEY,JSON.stringify({opens:r.opens||0,lastShown:r.lastShown??null,done:true}));}catch{}
}

export function guidePlatform(env=globalThis){
 const nav=env.navigator||{};
 return /iPhone|iPad|iPod/.test(nav.userAgent||'')||(nav.platform==='MacIntel'&&nav.maxTouchPoints>1)?'ios':'android';
}

// Small phone sketches; the highlighted control is what to tap.
const phone=inner=>`<svg class="install-shot" viewBox="0 0 120 200" aria-hidden="true"><rect x="6" y="4" width="108" height="192" rx="16" fill="var(--paper,#fff)" stroke="currentColor" stroke-width="3"/><rect x="44" y="11" width="32" height="6" rx="3" fill="currentColor" opacity=".25"/>${inner}</svg>`;
const hi='fill="#f2b84b"';
const shots={
 ios1:phone(`<rect x="16" y="28" width="88" height="10" rx="5" fill="currentColor" opacity=".12"/><rect x="16" y="46" width="88" height="110" rx="6" fill="currentColor" opacity=".06"/><rect x="6" y="166" width="108" height="26" fill="currentColor" opacity=".08"/><circle cx="60" cy="179" r="11" ${hi}/><path d="M60 172v11m-4-7 4-4 4 4m-8 4v6h8v-6" fill="none" stroke="#1d2a24" stroke-width="2" stroke-linecap="round"/>`),
 ios2:phone(`<rect x="12" y="70" width="96" height="118" rx="10" fill="currentColor" opacity=".08"/><rect x="18" y="80" width="84" height="18" rx="5" fill="currentColor" opacity=".1"/><rect x="18" y="104" width="84" height="22" rx="5" ${hi}/><rect x="24" y="109" width="12" height="12" rx="3" fill="none" stroke="#1d2a24" stroke-width="2"/><path d="M30 112v6m-3-3h6" stroke="#1d2a24" stroke-width="2"/><rect x="42" y="112" width="52" height="5" rx="2" fill="#1d2a24"/><rect x="18" y="132" width="84" height="18" rx="5" fill="currentColor" opacity=".1"/>`),
 ios3:phone(`<rect x="16" y="28" width="88" height="40" rx="6" fill="currentColor" opacity=".06"/><rect x="24" y="36" width="24" height="24" rx="6" fill="#1f5d48"/><rect x="54" y="42" width="44" height="5" rx="2" fill="currentColor" opacity=".4"/><rect x="74" y="74" width="30" height="14" rx="5" ${hi}/><rect x="80" y="79" width="18" height="4" rx="2" fill="#1d2a24"/>`),
 and1:phone(`<rect x="6" y="22" width="108" height="20" fill="currentColor" opacity=".08"/><rect x="14" y="27" width="70" height="10" rx="5" fill="currentColor" opacity=".15"/><circle cx="100" cy="32" r="9" ${hi}/><circle cx="100" cy="27" r="1.6" fill="#1d2a24"/><circle cx="100" cy="32" r="1.6" fill="#1d2a24"/><circle cx="100" cy="37" r="1.6" fill="#1d2a24"/><rect x="16" y="50" width="88" height="130" rx="6" fill="currentColor" opacity=".06"/>`),
 and2:phone(`<rect x="44" y="24" width="66" height="110" rx="8" fill="currentColor" opacity=".08"/><rect x="50" y="32" width="54" height="10" rx="4" fill="currentColor" opacity=".12"/><rect x="50" y="48" width="54" height="10" rx="4" fill="currentColor" opacity=".12"/><rect x="48" y="64" width="58" height="16" rx="5" ${hi}/><rect x="54" y="70" width="42" height="4" rx="2" fill="#1d2a24"/><rect x="50" y="86" width="54" height="10" rx="4" fill="currentColor" opacity=".12"/>`),
 and3:phone(`<rect x="14" y="70" width="92" height="60" rx="10" fill="currentColor" opacity=".08"/><rect x="24" y="80" width="18" height="18" rx="5" fill="#1f5d48"/><rect x="48" y="85" width="48" height="5" rx="2" fill="currentColor" opacity=".4"/><rect x="66" y="108" width="34" height="14" rx="5" ${hi}/><rect x="72" y="113" width="22" height="4" rx="2" fill="#1d2a24"/>`)
};
const steps={
 ios:[['ios1','Apri il sito in Safari e tocca il pulsante Condividi in basso.'],['ios2','Scorri e scegli «Aggiungi alla schermata Home».'],['ios3','Tocca «Aggiungi»: l’icona di Rent to a Friend compare sulla Home.']],
 android:[['and1','Apri il sito in Chrome e tocca il menu ⋮ in alto a destra.'],['and2','Scegli «Installa app» oppure «Aggiungi a schermata Home».'],['and3','Conferma con «Installa»: l’app compare tra le tue app.']]
};
export function installGuideMarkup(platform='ios',{canPrompt=false}={}){
 const list=key=>`<ol class="install-steps" data-install-platform="${key}" ${key===platform?'':'hidden'}>${steps[key].map(([shot,text],i)=>`<li>${shots[shot]}<p><b>${i+1}.</b> ${text}</p></li>`).join('')}</ol>`;
 return `<h2>Metti Rent to a Friend sulla Home</h2><p>Si apre come un’app, a schermo intero, e su iPhone ricevi anche le notifiche.</p>`+
  `<div class="install-tabs" role="tablist"><button type="button" class="chip${platform==='ios'?' active':''}" data-action="install-platform" data-value="ios" aria-selected="${platform==='ios'}">iPhone</button><button type="button" class="chip${platform==='android'?' active':''}" data-action="install-platform" data-value="android" aria-selected="${platform==='android'}">Android</button></div>`+
  list('ios')+list('android')+
  `<div class="install-actions">${canPrompt?'<button type="button" class="btn primary" data-action="install-now">Installa ora</button>':''}<button type="button" class="btn ${canPrompt?'secondary':'primary'}" data-action="install-done">Già fatto</button><button type="button" class="text-button" data-action="close">Più tardi</button></div>`;
}
