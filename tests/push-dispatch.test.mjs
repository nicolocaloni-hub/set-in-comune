import test from 'node:test';import assert from 'node:assert/strict';
import webpush from 'web-push';import {createECDH,randomBytes} from 'node:crypto';
import {allowedPushEndpoint,pushPayload,processPushJobs,sameSecret} from '../supabase/functions/push-dispatch/core.mjs';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
test('push transport rejects SSRF destinations and payloads never contain message text',()=>{
 for(const endpoint of ['http://fcm.googleapis.com/x','https://127.0.0.1/x','https://fcm.googleapis.com.evil.test/x','https://user:password@web.push.apple.com/x','https://web.push.apple.com:444/x'])assert.equal(allowedPushEndpoint(endpoint),false);
 assert.equal(allowedPushEndpoint('https://web.push.apple.com/opaque'),true);
 const payload=pushPayload({kind:'message',bookingId:id,userId:id,body:'private conversation',unreadTotal:3});assert.ok(!JSON.stringify(payload).includes('private conversation'));assert.equal(payload.url,'/#messages?booking='+id);
});
test('delivery processing records success, permanent expiry and transient retries separately',async()=>{
 const finished=[];const jobs=[201,410,503].map((status,i)=>({jobId:String(i),leaseToken:'lease'+i,kind:'message',bookingId:id,userId:id,endpoint:'https://fcm.googleapis.com/fcm/send/'+status,p256dh:'key',auth:'auth'}));
 const result=await processPushJobs({jobs,config:{},send:async sub=>{const status=Number(sub.endpoint.split('/').at(-1));if(status!==201)throw {statusCode:status};},finish:async(...args)=>finished.push(args)});
 assert.deepEqual(result,{processed:3,sent:1,retry:1,expired:1,failed:0});assert.equal(finished.length,3);assert.equal(finished[1][2],410);
});
test('Web Push library encrypts payload and signs VAPID without exposing its private key',()=>{
 const keys=webpush.generateVAPIDKeys(),client=createECDH('prime256v1');client.generateKeys();
 const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/fixture',keys:{p256dh:client.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}};
 const request=webpush.generateRequestDetails(subscription,'private test payload',{vapidDetails:{subject:'https://app.example',...keys}});
 assert.ok(Buffer.isBuffer(request.body));assert.ok(!request.body.toString().includes('private test payload'));assert.match(request.headers.Authorization,/vapid/);assert.ok(!JSON.stringify(request.headers).includes(keys.privateKey));
});
test('webhook secret validation compares hashed values',async()=>{assert.equal(await sameSecret('fixture','fixture'),true);assert.equal(await sameSecret('fixture','other'),false);assert.equal(await sameSecret(null,'fixture'),false);});
