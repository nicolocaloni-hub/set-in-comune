import test from 'node:test';import assert from 'node:assert/strict';import webpush from 'web-push';
import {notificationCapabilities,createPushClient} from '../src/notifications.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
function fixture({ios=false,installed=false,demo=false,saveFails=false,deleteFails=false}={}){
 const calls=[],key=webpush.generateVAPIDKeys().publicKey;
 const sub={endpoint:'https://fcm.googleapis.com/fcm/send/fixture',toJSON:()=>({endpoint:'https://fcm.googleapis.com/fcm/send/fixture',keys:{p256dh:'B'+'a'.repeat(86),auth:'a'.repeat(22)}}),unsubscribe:async()=>{calls.push('unsubscribe');return true;}};
 let subscription=null;
 const reg={active:{postMessage:data=>calls.push(data.type)},pushManager:{getSubscription:async()=>subscription,subscribe:async options=>{calls.push('subscribe');assert.equal(options.userVisibleOnly,true);subscription=sub;return sub;}}};
 const env={isSecureContext:true,navigator:{userAgent:ios?'iPhone':'Chromium',serviceWorker:{register:async()=>reg,ready:Promise.resolve(reg)},clearAppBadge:async()=>calls.push('clear-badge')},Notification:{permission:'default',requestPermission:async()=>{calls.push('permission');return 'granted';}},PushManager:{},matchMedia:()=>({matches:installed}),addEventListener:()=>{}};
 const api={user:()=>({id:uid}),pushConfig:async()=>{calls.push('config');return {publicKey:key};},savePushSubscription:async data=>{calls.push('save');assert.equal(data.endpoint,sub.endpoint);if(saveFails)throw new Error('save failed');},pushStatus:async()=>({enabled:true,messages:true,requests:false}),removePushSubscription:async()=>{calls.push('remove');if(deleteFails)throw new Error('offline');}};
 return {client:createPushClient(api,{env,demo}),calls,env,sub};
}
test('permission is never requested on initialization or status inspection',async()=>{const f=fixture();await f.client.init();await f.client.status();assert.ok(!f.calls.includes('permission'));});
test('iPhone requires a Home Screen app before asking for notification permission',async()=>{const f=fixture({ios:true});await assert.rejects(f.client.enable(),/schermata Home/);assert.ok(!f.calls.includes('permission'));assert.equal(notificationCapabilities(f.env).ios,true);});
test('activation is a user gesture, stores this device and binds only its current account',async()=>{const f=fixture({ios:true,installed:true});await f.client.enable({messages:true,requests:false});assert.ok(f.calls.indexOf('permission')<f.calls.indexOf('config'));assert.ok(f.calls.includes('save'));assert.ok(f.calls.includes('BIND_PUSH_USER'));});
test('a failed backend save rolls back the newly created browser subscription',async()=>{const f=fixture({saveFails:true});await assert.rejects(f.client.enable(),/save failed/);assert.ok(f.calls.includes('unsubscribe'));assert.ok(!f.calls.includes('BIND_PUSH_USER'));});
test('disabling still clears local subscriptions and worker state when the network fails',async()=>{const f=fixture({deleteFails:true});await f.client.enable();await assert.rejects(f.client.disable(),/offline/);assert.ok(f.calls.includes('unsubscribe'));assert.ok(f.calls.includes('CLEAR_PUSH_USER'));});
test('demo mode cannot subscribe a fictitious user or request OS permission',async()=>{const f=fixture({demo:true});await assert.rejects(f.client.enable(),/persone reali/);assert.ok(!f.calls.includes('permission'));});
