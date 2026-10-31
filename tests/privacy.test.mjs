import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {privacyMarkup,termsMarkup,assertPrivacyReady,privacySettings} from '../src/privacy.js';
test('real-account builds fail closed until controller and retention are reviewed',()=>{
 assert.throws(()=>assertPrivacyReady(),/titolare/);
 assert.throws(()=>assertPrivacyReady({...privacySettings,reviewed:true,controller:'Un gestore'}),/conservazione/);
 assert.doesNotThrow(()=>assertPrivacyReady({reviewed:true,controller:'Gestore di prova',contact:'privacy@example.org',retention:'Regole approvate'}));
 const result=spawnSync(process.execPath,['scripts/build.mjs'],{env:{...process.env,PUBLIC_SUPABASE_URL:'https://example.supabase.co',PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_'+'a'.repeat(32)},encoding:'utf8'});
 assert.notEqual(result.status,0);assert.match(result.stderr,/informativa privacy/);
});
test('privacy explains demo hosting, real providers, public photos, AI and erasure limits honestly',()=>{
 const html=privacyMarkup(true);for(const text of ['Vercel','Supabase','Resend','EXIF','non è un chatbot AI','non equivale','pre-lancio','indirizzo IP'])assert.ok(html.includes(text),text);
 assert.ok(termsMarkup().includes('non attiva abbonamenti'));assert.ok(termsMarkup().includes('simulazioni'));
});
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
const {api}=await import('../src/api.js');
test('demo erasure creates one clearly pending request and export contains no authentication tokens',async()=>{
 const first=await api.requestErasure();assert.equal(await api.requestErasure(),first);
 const requests=await api.privacyRequests();assert.equal(requests.length,1);assert.equal(requests[0].status,'open');
 const exported=await api.exportData();assert.equal(exported.demo,true);assert.equal(exported.privacy_requests[0].id,first);assert.ok(!JSON.stringify(exported).includes('access_token'));assert.deepEqual(await api.unusedUploads(),[]);
});
