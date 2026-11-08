export function notificationCapabilities(env=globalThis) {
 const nav=env.navigator||{};
 const ios=/iPhone|iPad|iPod/.test(nav.userAgent||'')||(nav.platform==='MacIntel'&&nav.maxTouchPoints>1);
 const installed=Boolean(nav.standalone||env.matchMedia?.('(display-mode: standalone)').matches);
 return {ios,installed,supported:Boolean(env.isSecureContext&&nav.serviceWorker&&env.PushManager&&env.Notification),permission:env.Notification?.permission||'unsupported'};
}
export function subscriptionBody(subscription) {
 const value=subscription.toJSON();
 if(!value.endpoint||!value.keys?.p256dh||!value.keys?.auth)throw new Error('Il browser non ha creato una sottoscrizione valida.');
 return {endpoint:value.endpoint,p256dh:value.keys.p256dh,auth:value.keys.auth};
}
export function decodePushKey(value) {
 const raw=atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4));
 const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
 if(bytes.length!==65||bytes[0]!==4)throw new Error('Le notifiche non sono ancora configurate.');
 return bytes;
}
export function createPushClient(api,{env=globalThis,demo=false}={}) {
 let registration=null,installPrompt=null;
 const caps=()=>notificationCapabilities(env);
 async function register(){
  if(!env.navigator?.serviceWorker||!env.isSecureContext)return null;
  registration ||= await env.navigator.serviceWorker.register('/sw.js',{scope:'/'});
  return registration;
 }
 async function init(){env.addEventListener?.('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});try{await register();}catch{}}
 async function status(){
  const capabilities=caps();
  if(!capabilities.supported)return {...capabilities,enabled:false};
  const reg=await register();const subscription=await reg.pushManager.getSubscription();
  if(!subscription||!api.user()||demo)return {...capabilities,enabled:false};
  const settings=await api.pushStatus(subscription.endpoint);
  return {...capabilities,...settings,enabled:Boolean(settings?.enabled),subscription};
 }
 async function enable({messages=true,requests=true}={}){
  const capabilities=caps();
  if(capabilities.ios&&!capabilities.installed)throw new Error('Su iPhone aggiungi prima l’app alla schermata Home e aprila dalla sua icona.');
  if(!capabilities.supported)throw new Error('Questo browser non supporta le notifiche push. Prova un browser aggiornato.');
  if(demo)throw new Error('Per attivare le notifiche tra persone reali, accedi alla versione collegata al database.');
  if(!api.user())throw new Error('Accedi al tuo account per attivare le notifiche.');
  // This must be called directly from the user's click, before network requests.
  const permission=await env.Notification.requestPermission();
  if(permission!=='granted')throw new Error(permission==='denied'?'Le notifiche sono bloccate nelle impostazioni del browser. Puoi riattivarle da lì.':'Notifiche non attivate. Puoi riprovare quando vuoi.');
  const config=await api.pushConfig();if(!config?.publicKey)throw new Error('Le notifiche non sono ancora disponibili. Riprova più tardi.');
  const reg=await register();await env.navigator.serviceWorker.ready;
  let subscription=await reg.pushManager.getSubscription();
  if(subscription&&subscription.options?.applicationServerKey){const key=decodePushKey(config.publicKey);if(new Uint8Array(subscription.options.applicationServerKey).some((x,i)=>x!==key[i])){await subscription.unsubscribe();subscription=null;}}
  subscription ||= await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodePushKey(config.publicKey)});
  try{await api.savePushSubscription({...subscriptionBody(subscription),messages,requests});}
  catch(error){await subscription.unsubscribe().catch(()=>{});throw error;}
  await reg.active?.postMessage({type:'BIND_PUSH_USER',userId:api.user().id});
  return subscription;
 }
 async function disable(){const reg=await register();const sub=await reg?.pushManager.getSubscription();let failure;if(sub){try{if(!demo&&api.user())await api.removePushSubscription(sub.endpoint);}catch(e){failure=e;}try{await sub.unsubscribe();}catch(e){failure||=e;}}reg?.active?.postMessage({type:'CLEAR_PUSH_USER'});await clearBadge();if(failure)throw failure;}
 async function refreshBinding(){if(demo||!api.user())return;const reg=await register();const sub=await reg?.pushManager.getSubscription();if(sub&&env.Notification.permission==='granted'){const settings=await api.pushStatus(sub.endpoint);if(settings?.enabled){await api.savePushSubscription({...subscriptionBody(sub),messages:settings.messages,requests:settings.requests});reg.active?.postMessage({type:'BIND_PUSH_USER',userId:api.user().id});}}}
 async function updateBadge(value){try{if(value>0&&env.navigator?.setAppBadge)await env.navigator.setAppBadge(value);else await clearBadge();}catch{}}
 async function clearBadge(){try{await env.navigator?.clearAppBadge?.();}catch{}}
 async function install(){if(installPrompt){await installPrompt.prompt();installPrompt=null;return true;}return false;}
 return {init,status,enable,disable,refreshBinding,updateBadge,install,canInstall:()=>Boolean(installPrompt),capabilities:caps};
}
