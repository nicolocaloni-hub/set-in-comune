import test from 'node:test';import assert from 'node:assert/strict';
import {eraseJob,verifyErasure,allowedOrigin,secureEqual} from '../supabase/functions/account-erasure/core.mjs';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',lease='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',job={user_id:uid,lease};
function fixture(){const order=[];return {order,io:{revoke:async()=>order.push('revoke'),list:async(bucket)=>{order.push('list:'+bucket);return [];},remove:async()=>order.push('remove'),eraseRecords:async()=>order.push('records'),deleteAuth:async()=>order.push('auth'),finish:async(u,l,done)=>order.push('finish:'+done)}};}
test('erasure checks real user and password; body cannot choose a different account',async()=>{
 const calls=[];const io={getUser:async token=>({id:uid,email:'fixture@example.test',email_confirmed_at:'2026-01-01'}),reauthenticate:async(email,password)=>{calls.push(email);return {user:{id:uid},access_token:'temporary-fixture'};}};
 const out=await verifyErasure({confirmation:'ELIMINA',password:'fixture-password',userId:lease},'fixture-bearer',io);assert.equal(out.userId,uid);assert.deepEqual(calls,['fixture@example.test']);
 await assert.rejects(verifyErasure({confirmation:'ELIMINA',password:'fixture-password'},'x',{...io,reauthenticate:async()=>({user:{id:lease}})}),/Account non valido/);
 await assert.rejects(verifyErasure({confirmation:'NO',password:'fixture-password'},'x',io),/Conferma/);
});
test('session revocation, physical files, database records and Auth deletion happen in order',async()=>{const f=fixture();assert.equal(await eraseJob(job,f.io),true);assert.equal(f.order[0],'revoke');assert.ok(f.order.indexOf('records')>f.order.indexOf('list:handoff-photos'));assert.ok(f.order.indexOf('auth')>f.order.indexOf('records'));assert.equal(f.order.at(-1),'finish:true');});
test('file deletion failure never deletes database records or Auth and remains retryable',async()=>{const f=fixture();let calls=0;f.io.list=async()=>++calls===1?[uid+'/fixture.jpg']:[];f.io.remove=async()=>{throw Error('Provider down');};assert.equal(await eraseJob(job,f.io),false);assert.ok(!f.order.includes('records'));assert.ok(!f.order.includes('auth'));assert.equal(f.order.at(-1),'finish:false');});
test('worker refuses paths of another account and verifies actual removal',async()=>{for(const paths of [[lease+'/foreign.jpg'],[uid+'/../foreign.jpg']]){const f=fixture();f.io.list=async()=>paths;assert.equal(await eraseJob(job,f.io),false);assert.ok(!f.order.includes('remove'));}const f=fixture();f.io.list=async()=>[uid+'/file.jpg'];assert.equal(await eraseJob(job,f.io),false);assert.ok(!f.order.includes('records'));});
test('strict origins and constant-length comparison reject arbitrary clients',async()=>{assert.equal(allowedOrigin('https://app.example',['https://app.example']),true);assert.equal(allowedOrigin('https://app.example.evil',['https://app.example']),false);assert.equal(allowedOrigin('http://app.example',['http://app.example']),false);assert.equal(await secureEqual('server-secret-fixture','server-secret-fixture'),true);assert.equal(await secureEqual('other','server-secret-fixture'),false);});

test('erasure forwards a bounded captcha token only to reauthentication',async()=>{
 let supplied;const io={getUser:async()=>({id:uid,email:'fixture@example.test',email_confirmed_at:'2026-01-01'}),reauthenticate:async(...args)=>{supplied=args;return {user:{id:uid},access_token:'temporary-fixture'};}};
 const result=await verifyErasure({confirmation:'ELIMINA',password:'fixture-password',gotrue_meta_security:{captcha_token:'captcha-fixture'}},'fixture',io);
 assert.equal(supplied[2],'captcha-fixture');assert.deepEqual(result,{userId:uid,temporaryToken:'temporary-fixture'});
 await assert.rejects(verifyErasure({confirmation:'ELIMINA',password:'fixture-password',gotrue_meta_security:{captcha_token:'x'.repeat(2049)}},'fixture',io),/sicurezza/);
});
