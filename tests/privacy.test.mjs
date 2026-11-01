import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {cookiesMarkup} from '../src/browser-storage.js';
import {retentionPolicy} from '../src/retention.js';
import {privacyMarkup,termsMarkup,assertPrivacyReady,privacySettings} from '../src/privacy.js';
test('real-account builds fail closed until controller and retention are reviewed',()=>{
 assert.throws(()=>assertPrivacyReady(),/titolare/);
 assert.throws(()=>assertPrivacyReady({...privacySettings,reviewed:true,controller:'Un gestore'}),/conservazione/);
 retentionPolicy.approved=true;try{assert.doesNotThrow(()=>assertPrivacyReady({reviewed:true,controller:'Gestore di prova',controllerAddress:'Recapito professionale di prova',providersReviewed:true,contact:'privacy@example.org',retention:'Regole approvate'}));}finally{retentionPolicy.approved=false;}
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

test('reviewed connected documents describe active email and account features without demo-only notices',()=>{
 const previous={...privacySettings},approved=retentionPolicy.approved;
 try{
  Object.assign(privacySettings,{reviewed:true,providersReviewed:true,controllerAddress:'Recapito di prova <non pubblicare>',retention:'Criteri di prova approvati'});
  retentionPolicy.approved=true;
  const privacy=privacyMarkup(false),terms=termsMarkup(false);
  assert.ok(privacy.includes('consegna le email di conferma indirizzo e recupero password'));
  assert.ok(privacy.includes('Non invia email per messaggi, noleggi o marketing'));
  assert.ok(privacy.includes('Criteri di prova approvati'));
  assert.ok(terms.includes('Recapito di prova &lt;non pubblicare&gt;'));
  for(const text of ['demo pubblica','collegamento email non attivo','non è conclusa','bozza da approvare'])assert.ok(!privacy.includes(text),text);
  for(const text of ['account reali restano chiusi','non è ancora stato fornito'])assert.ok(!terms.includes(text),text);
  assert.ok(terms.includes('non gestisce pagamenti, cauzioni, rimborsi o polizze'));
  assert.ok(terms.includes('il gestore non trattiene commissioni'));
  assert.ok(terms.includes('avvengono fuori dall’app'));
 }finally{Object.assign(privacySettings,previous);retentionPolicy.approved=approved;}
});
test('connected browser-storage disclosure omits local demo data and keeps PKCE and session limits',()=>{
 const connected=cookiesMarkup(false),demo=cookiesMarkup(true);
 assert.ok(!connected.includes('sic-demo-v1'));
 assert.ok(!connected.includes('Cancella e ripristina demo'));
 assert.ok(demo.includes('sic-demo-v1'));
 assert.ok(demo.includes('Cancella e ripristina demo'));
 for(const text of ['sic-pkce-v1','stesso browser','sic-session-v2','ripristino delle schede','non cancella un account sui server'])assert.ok(connected.includes(text),text);
});
