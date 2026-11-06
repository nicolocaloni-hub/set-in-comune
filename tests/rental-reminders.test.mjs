import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {upcomingHandoff} from '../src/domain.js';
import {pushPayload} from '../supabase/functions/push-dispatch/core.mjs';

const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',bid='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

test('in-app banner covers pickups and returns today or tomorrow only',()=>{
 const now='2026-11-10';
 assert.deepEqual(upcomingHandoff({status:'accepted',start_date:'2026-11-11',end_date:'2026-11-14'},now),{stage:'pickup',when:'tomorrow'});
 assert.deepEqual(upcomingHandoff({status:'accepted',start_date:'2026-11-10',end_date:'2026-11-14'},now),{stage:'pickup',when:'today'});
 assert.deepEqual(upcomingHandoff({status:'collected',start_date:'2026-11-01',end_date:'2026-11-11'},now),{stage:'return',when:'tomorrow'});
 assert.equal(upcomingHandoff({status:'accepted',start_date:'2026-11-12',end_date:'2026-11-14'},now),null);
 assert.equal(upcomingHandoff({status:'requested',start_date:'2026-11-11',end_date:'2026-11-14'},now),null);
 assert.equal(upcomingHandoff({status:'returned',start_date:'2026-11-01',end_date:'2026-11-10'},now),null);
 assert.equal(upcomingHandoff({status:'collected',start_date:'2026-11-01',end_date:'2026-11-09'},now),null,'overdue returns are not reminders');
});

test('push payload for reminders links to the booking and carries no free text',()=>{
 const job={kind:'reminder',reminderStage:'return',userId:uid,bookingId:bid,threadType:'booking',unreadTotal:3};
 assert.deepEqual(pushPayload(job),{kind:'reminder',stage:'return',userId:uid,url:'/#bookings?booking='+bid,tag:'reminder-return-'+bid,unreadTotal:3});
 assert.throws(()=>pushPayload({...job,reminderStage:'party'}),/Invalid job/);
 assert.throws(()=>pushPayload({...job,threadType:'inquiry'}),/Invalid job/);
 assert.throws(()=>pushPayload({...job,kind:'other'}),/Invalid job/);
 assert.equal(pushPayload({kind:'message',userId:uid,bookingId:bid,threadType:'booking'}).url,'/#messages?booking='+bid);
});

test('service worker shows reminder titles for the bound account only',async()=>{
 const listeners={},store=new Map(),shown=[];
 const cache={addAll:async()=>{},put:async(k,v)=>store.set(k,v),delete:async k=>store.delete(k)};
 const self={location:{origin:'https://app.example'},addEventListener:(t,fn)=>listeners[t]=fn,skipWaiting:async()=>{},navigator:{},registration:{showNotification:async(...a)=>shown.push(a),getNotifications:async()=>[]},clients:{claim:async()=>{},matchAll:async()=>[],openWindow:async()=>{}}};
 vm.runInNewContext(await readFile(new URL('../src/sw.js',import.meta.url),'utf8'),{self,URL,Response,caches:{open:async()=>cache,match:async k=>store.get(k)?.clone(),keys:async()=>[],delete:async()=>{}},fetch:async()=>new Response('')});
 const dispatch=async(type,data)=>{let pending;listeners[type]({...data,waitUntil:p=>pending=p});await pending;};
 await dispatch('message',{source:{url:'https://app.example/'},data:{type:'BIND_PUSH_USER',userId:uid}});
 await dispatch('push',{data:{json:()=>({kind:'reminder',stage:'pickup',userId:uid,url:'/#bookings?booking='+bid})}});
 await dispatch('push',{data:{json:()=>({kind:'reminder',stage:'return',userId:uid,url:'/#bookings?booking='+bid})}});
 await dispatch('push',{data:{json:()=>({kind:'reminder',stage:'other',userId:uid,url:'/#bookings?booking='+bid})}});
 await dispatch('push',{data:{json:()=>({kind:'reminder',stage:'pickup',userId:'someone-else',url:'/#bookings?booking='+bid})}});
 assert.deepEqual(shown.map(s=>s[0]),['Domani il ritiro','Domani la restituzione']);
 assert.equal(shown[0][1].data.url,'https://app.example/#bookings?booking='+bid);
});
