import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createCaptchaGate,createCaptchaClient,captchaPayload,validateCaptchaSiteKey} from '../src/captcha.js';
import {securityHeaders} from '../scripts/assets.mjs';
const siteKey='0x'+'A'.repeat(22);
test('captcha tokens expire, cannot be reused and cannot be replaced by unbounded input',()=>{
 let now=1000;const gate=createCaptchaGate(()=>now);
 assert.throws(()=>gate.take(),/verifica/i);gate.accept('fixture');assert.equal(gate.take(),'fixture');assert.throws(()=>gate.take());
 gate.accept('expired');now+=270000;assert.throws(()=>gate.take(),/scaduta/);
 assert.throws(()=>gate.accept('x'.repeat(2049)));assert.throws(()=>captchaPayload({},true));
 assert.deepEqual(captchaPayload('fixture',true),{gotrue_meta_security:{captcha_token:'fixture'}});
 for(const key of ['secret-key','https://evil.example','1x00000000000000000000AA','0x'+'A'.repeat(33)])assert.throws(()=>validateCaptchaSiteKey(key));
});
test('widgets have isolated lifecycles and demo never contacts the provider',async()=>{
 const callbacks=[],events=[];
 const doc={createElement:()=>({append(){},setAttribute(){}})};
 const win={turnstile:{render(_node,options){callbacks.push(options);return callbacks.length;},reset(id){events.push('reset:'+id);},remove(id){events.push('remove:'+id);}}};
 const form=id=>({id,dataset:{},isConnected:true,querySelector:()=>null,insertBefore(){}});
 const first=form('auth-form'),second=form('reset-form'),client=createCaptchaClient({siteKey,document:doc,window:win});
 await client.mount(first);assert.throws(()=>client.take(first));callbacks[0].callback('first');assert.equal(client.take(first),'first');assert.throws(()=>client.take(first));
 callbacks[0].callback('old');await client.mount(second);callbacks[0].callback('stale');assert.throws(()=>client.take(second));
 callbacks[1].callback('second');callbacks[1]['expired-callback']();assert.throws(()=>client.take(second));
 callbacks[1].callback('second');client.reset(second);assert.throws(()=>client.take(second));
 // A widget error (e.g. domain not allowed) must not block the form: take() hands over null and the server decides.
 callbacks[1].callback('second');callbacks[1]['error-callback']();assert.equal(client.take(second),null);
 callbacks[1].callback('recovered');assert.equal(client.take(second),'recovered');
 client.clear();assert.deepEqual(events,['remove:1','reset:2','remove:2']);
 const demo=createCaptchaClient({demo:true,siteKey,document:undefined,window:undefined});await demo.mount(first);assert.equal(demo.take(first),'');
 assert.ok(!securityHeaders()['Content-Security-Policy'].includes('cloudflare'));
 assert.match(securityHeaders('https://example.supabase.co',true)['Content-Security-Policy'],/frame-src https:\/\/challenges.cloudflare.com/);
});
test('a Turnstile script that cannot load leaves the form usable',async()=>{
 const doc={head:{append(s){queueMicrotask(()=>s.onerror());}},createElement:()=>({append(){},setAttribute(){},remove(){}})};
 const form={id:'auth-form',dataset:{signup:'true'},isConnected:true,querySelector:()=>null,insertBefore(){}};
 const client=createCaptchaClient({siteKey,document:doc,window:{}});
 await client.mount(form);assert.equal(client.take(form),null);
 assert.deepEqual(captchaPayload(null,true),{});assert.throws(()=>captchaPayload('',true));
});
test('signup, login and recovery require captcha when configured, but token refresh does not',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'rtaf-captcha-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await cp(new URL('../src',import.meta.url),join(dir,'src'),{recursive:true});
 await writeFile(join(dir,'package.json'),'{"type":"module"}');
 await writeFile(join(dir,'src/config.js'),'export default '+JSON.stringify({url:'https://example.supabase.co',key:'sb_publishable_'+'a'.repeat(32)})+';');
 await writeFile(join(dir,'src/captcha-config.js'),'export default '+JSON.stringify({siteKey})+';');
 const originals={fetch:globalThis.fetch,localStorage:globalThis.localStorage,sessionStorage:globalThis.sessionStorage,location:globalThis.location};
 t.after(()=>Object.assign(globalThis,originals));
 const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k),m};};
 globalThis.localStorage=storage();globalThis.sessionStorage=storage();globalThis.location={href:'https://rent-to-a-friend.it/'};
 const calls=[];const user={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',email:'fixture@example.test'};
 globalThis.fetch=async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return new Response(JSON.stringify(url.includes('token?')?{user,access_token:'fixture',refresh_token:'fixture-refresh',expires_in:0}:{}));};
 const {api}=await import(pathToFileURL(join(dir,'src/api.js')));
 for(const run of [token=>api.login('fixture@example.test','fixture-password',token),token=>api.signup('fixture@example.test','fixture-password','Fixture',token),token=>api.reset('fixture@example.test',token)]){
  const n=calls.length;await assert.rejects(run(),/sicurezza/);assert.equal(calls.length,n);await run('captcha-fixture');assert.equal(calls.at(-1).body.gotrue_meta_security.captcha_token,'captcha-fixture');
  await run(null);assert.equal(calls.at(-1).body.gotrue_meta_security,undefined);
 }
 await api.eraseAccount('fixture-password','erasure-fixture');
 const refresh=calls.find(c=>c.url.includes('grant_type=refresh_token'));assert.ok(refresh);assert.equal(refresh.body.gotrue_meta_security,undefined);
 assert.equal(calls.at(-1).body.gotrue_meta_security.captcha_token,'erasure-fixture');
 assert.ok(!JSON.stringify([...localStorage.m,...sessionStorage.m]).includes('captcha-fixture'));
});
