const CACHE='sic-offline-__BUILD_REVISION__';
const STATE_CACHE='sic-push-device-state';
const STATE_URL=new URL('/__push-user-state',self.location.origin).href;
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(['/offline.html','/style.css','/icon-192.png']);await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('sic-offline-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(async()=>await caches.match('/offline.html')));else if(new URL(event.request.url).origin===self.location.origin&&['/style.css','/icon-192.png'].includes(new URL(event.request.url).pathname))event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));});
self.addEventListener('message',event=>{
 if(!event.source?.url||new URL(event.source.url).origin!==self.location.origin)return;
 const data=event.data||{};
 if(data.type==='BIND_PUSH_USER'&&/^[a-f0-9-]{36}$/i.test(data.userId))event.waitUntil((async()=>{const cache=await caches.open(STATE_CACHE);await cache.put(STATE_URL,new Response(JSON.stringify({userId:data.userId}),{headers:{'Content-Type':'application/json'}}));})());
 if(data.type==='CLEAR_PUSH_USER')event.waitUntil((async()=>{const cache=await caches.open(STATE_CACHE);await cache.delete(STATE_URL);for(const n of await self.registration.getNotifications())n.close();await self.navigator.clearAppBadge?.();})());
});
function notificationUrl(value){try{const u=new URL(value,self.location.origin);return u.origin===self.location.origin&&/^\/#(?:(?:messages|bookings)\?booking|messages\?conversation)=[a-f0-9-]{36}$/i.test(u.pathname+u.hash)?u.href:new URL('/#messages',self.location.origin).href;}catch{return new URL('/#messages',self.location.origin).href;}}
self.addEventListener('push',event=>event.waitUntil((async()=>{
 let data;try{data=event.data?.json();}catch{}if(!data||!['message','request'].includes(data.kind))return;
 const response=await caches.match(STATE_URL);let binding;try{binding=await response?.json();}catch{}
 if(!binding||binding.userId!==data.userId)return;
 const url=notificationUrl(data.url);
 await self.registration.showNotification(data.kind==='message'?'Nuovo messaggio':'Nuova richiesta di noleggio',{body:data.kind==='message'?'Qualcuno ti ha scritto su RENT TO A FRIEND.':'Apri l’app per vedere la richiesta ricevuta.',icon:'/icon-192.png',badge:'/icon-192.png',tag:String(data.tag||'set-in-comune').slice(0,100),data:{url},renotify:false});
 if(Number.isInteger(data.unreadTotal)&&data.unreadTotal>=0)try{if(data.unreadTotal)await self.navigator.setAppBadge?.(data.unreadTotal);else await self.navigator.clearAppBadge?.();}catch{}
 for(const client of await self.clients.matchAll({type:'window',includeUncontrolled:true}))client.postMessage({type:'NOTIFICATIONS_CHANGED'});
})()));
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{const url=notificationUrl(event.notification.data?.url);for(const client of await self.clients.matchAll({type:'window',includeUncontrolled:true})){if(new URL(client.url).origin===self.location.origin){await client.navigate(url);await client.focus();return;}}await self.clients.openWindow(url);})());});
