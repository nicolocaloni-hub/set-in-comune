import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createCaptchaClient} from '../src/captcha.js';

const siteKey='0x'+'A'.repeat(22);
async function fixture(t){
 const dir=await mkdtemp(join(tmpdir(),'rtaf-no-captcha-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await cp(new URL('../src',import.meta.url),join(dir,'src'),{recursive:true});
 await cp(new URL('../scripts',import.meta.url),join(dir,'scripts'),{recursive:true});
 await writeFile(join(dir,'package.json'),'{"type":"module"}');return dir;
}
test('disabled captcha leaves connected forms usable without touching the DOM or provider',async()=>{
 const boundary=new Proxy({},{get(){throw new Error('Disabled provider must not be accessed');}});
 const client=createCaptchaClient({siteKey:'',document:boundary,window:boundary});
 for(const form of [{id:'auth-form'},{id:'reset-form'},{id:'automatic-erasure-form'}]){
  await client.mount(form);assert.equal(client.take(form),'');client.reset(form);client.clear();
 }
});
test('without a site key, auth and erasure requests omit captcha metadata',async t=>{
 const dir=await fixture(t);
 await writeFile(join(dir,'src/config.js'),'export default '+JSON.stringify({url:'https://example.supabase.co',key:'sb_publishable_'+'a'.repeat(32)})+';');
 const originals={fetch:globalThis.fetch,localStorage:globalThis.localStorage,sessionStorage:globalThis.sessionStorage,location:globalThis.location};t.after(()=>Object.assign(globalThis,originals));
 const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
 globalThis.localStorage=storage();globalThis.sessionStorage=storage();globalThis.location={href:'https://rent-to-a-friend.it/'};
 const requests=[],user={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',email:'fixture@example.test'};
 globalThis.fetch=async(url,options)=>{
  requests.push({url,body:JSON.parse(options.body)});
  return Response.json(url.includes('/token?')?{user,access_token:'fixture',refresh_token:'fixture-refresh',expires_in:3600}:{});
 };
 const {api}=await import(pathToFileURL(join(dir,'src/api.js')));
 await api.signup('fixture@example.test','fixture-passphrase','Fixture');
 await api.reset('fixture@example.test');await api.login('fixture@example.test','fixture-passphrase');await api.eraseAccount('fixture-passphrase');
 assert.equal(requests.length,4);
 for(const r of requests)assert.equal(r.body.gotrue_meta_security,undefined,r.url);
 for(const r of requests.filter(r=>/signup|recover/.test(r.url)))assert.equal(new URL(r.url).searchParams.get('redirect_to'),'https://rent-to-a-friend.it/');
});
test('a lingering site key cannot enable the widget; explicit opt-in still requires a valid key',async t=>{
 const dir=await fixture(t);
 // Synthetic, isolated readiness only: production flags and backend are never changed.
 const privacy=join(dir,'src/privacy.js'),policy=join(dir,'src/service-policy.js');
 await writeFile(privacy,(await readFile(privacy,'utf8'))+'\nObject.assign(privacySettings,{reviewed:true,contactReviewComplete:true,postalAddressRequired:false,providersReviewed:true,retention:"Synthetic fixture only"});retentionPolicy.approved=true;\n');
 await writeFile(policy,(await readFile(policy,'utf8'))+'\nlegalRelease.approved=true;\n');
 const env={...process.env,PUBLIC_SUPABASE_URL:'https://example.supabase.co',PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_'+'a'.repeat(32),PUBLIC_TURNSTILE_SITE_KEY:siteKey};delete env.PUBLIC_TURNSTILE_ENABLED;
 const run=extra=>spawnSync(process.execPath,[join(dir,'scripts/build.mjs')],{cwd:dir,env:{...env,...extra},encoding:'utf8'});
 for(const setting of [undefined,'false']){
  const result=run(setting===undefined?{}:{PUBLIC_TURNSTILE_ENABLED:setting});assert.equal(result.status,0,result.stderr);
  assert.match(await readFile(join(dir,'dist/captcha-config.js'),'utf8'),/"siteKey":""/);
  assert.doesNotMatch(await readFile(join(dir,'dist/index.html'),'utf8'),/https:\/\/challenges\.cloudflare\.com/);
 }
 const {privacyMarkup}=await import(pathToFileURL(join(dir,'dist/privacy.js')));
 assert.match(privacyMarkup(false),/Turnstile: non attivo/);
 const enabled=run({PUBLIC_TURNSTILE_ENABLED:'true'});assert.equal(enabled.status,0,enabled.stderr);
 assert.match(await readFile(join(dir,'dist/captcha-config.js'),'utf8'),new RegExp(siteKey));
 assert.match(await readFile(join(dir,'dist/index.html'),'utf8'),/https:\/\/challenges\.cloudflare\.com/);
 for(const setting of ['yes','1'])assert.notEqual(run({PUBLIC_TURNSTILE_ENABLED:setting}).status,0);
 assert.notEqual(run({PUBLIC_TURNSTILE_ENABLED:'true',PUBLIC_TURNSTILE_SITE_KEY:''}).status,0);
});
