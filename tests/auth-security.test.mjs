import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

test('connected auth protects redirects, uses PKCE and keeps bearer tokens out of persistent storage',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'sic-auth-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await cp(new URL('../src',import.meta.url),join(dir,'src'),{recursive:true});
 await writeFile(join(dir,'package.json'),'{"type":"module"}');
 await writeFile(join(dir,'src/config.js'),'export default '+JSON.stringify({url:'https://example.supabase.co',key:'sb_publishable_'+'a'.repeat(32)})+';');
 const makeStorage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),data};};
 globalThis.localStorage=makeStorage();globalThis.sessionStorage=makeStorage();
 globalThis.location={href:'https://rent-to-a-friend.it/',origin:'https://rent-to-a-friend.it',pathname:'/',hash:''};
 const replaced=[];globalThis.history={replaceState:(_a,_b,url)=>replaced.push(url)};
 const user={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',email:'fixture@example.test',email_confirmed_at:'2026-01-01'};
 const fixture={access_token:'fixture-access',refresh_token:'fixture-refresh',expires_in:3600,user};
 const calls=[];let rejectLogin=false,updateError=null,logoutError=false;
 globalThis.fetch=async(url,options)=>{calls.push({url,options});if(url.endsWith('/user')&&options.method==='PUT'&&updateError)return new Response(JSON.stringify({code:updateError,message:'Internal provider details'}),{status:400});if(url.endsWith('/logout')&&logoutError)return new Response('{}',{status:503});if(rejectLogin)return new Response('{"message":"Internal user record details"}',{status:400});return new Response(JSON.stringify(url.endsWith('/user')?user:url.includes('/signup')||url.includes('/recover')?{}:fixture),{status:200});};
 const {api}=await import(pathToFileURL(join(dir,'src/api.js')));
 await t.test('injected implicit tokens or unsolicited codes are cleared and never stored',async()=>{
  location.href='https://app.example/#access_token=untrusted&refresh_token=untrusted';
  await assert.rejects(api.init(),/nuovo link/);assert.equal(calls.length,0);assert.equal(api.user(),null);assert.equal(replaced.at(-1),'/#profile');
  location.href='https://app.example/?code=unsolicited';await assert.rejects(api.init(),/nuovo link/);assert.equal(calls.length,0);
 });
 await t.test('signup produces an S256 challenge and never stores the password',async()=>{
  assert.equal(await api.signup('fixture@example.test','unit-fixture-passphrase','Fixture name'),false);
  const flow=JSON.parse(localStorage.getItem('sic-pkce-v1'));
  const body=JSON.parse(calls.at(-1).options.body);
  assert.equal(body.code_challenge_method,'s256');assert.equal(body.code_challenge,createHash('sha256').update(flow.verifier).digest('base64url'));
  assert.ok(!JSON.stringify([...localStorage.data]).includes('unit-fixture-passphrase'));
 });
 await t.test('signup and recovery always request the canonical callback, ignoring the browser origin, path and redirect parameters',async()=>{
  const originalLocation=globalThis.location;
  try{
   for(const href of ['https://preview.example/nested/path?redirect_to=https://attacker.example/#login','https://rent-to-a-friend.it/untrusted?next=//attacker.example/#profile']){
    const page=new URL(href);globalThis.location={href,origin:page.origin,pathname:page.pathname,search:page.search,hash:page.hash};
    for(const action of ['signup','reset']){
     if(action==='signup')await api.signup('fixture@example.test','unit-fixture-passphrase','Fixture name');else await api.reset('fixture@example.test');
     const request=new URL(calls.at(-1).url);
     assert.equal(request.pathname,'/auth/v1/'+(action==='signup'?'signup':'recover'));
     assert.deepEqual([...request.searchParams],[['redirect_to','https://rent-to-a-friend.it/']]);
     assert.equal(request.hash,'');
    }
   }
  }finally{globalThis.location=originalLocation;}
 });
 await t.test('a valid recovery flow exchanges the code using its local verifier and cleans the URL',async()=>{
  await api.reset('fixture@example.test');const flow=JSON.parse(localStorage.getItem('sic-pkce-v1'));
  location.href='https://rent-to-a-friend.it/?code=fixture-code';
  assert.equal(await api.init(),true);
  const exchange=calls.find(c=>c.url.endsWith('token?grant_type=pkce'));
  assert.equal(JSON.parse(exchange.options.body).code_verifier,flow.verifier);
  assert.equal(localStorage.getItem('sic-pkce-v1'),null);
  assert.equal(localStorage.getItem('sic-session-v2'),null);assert.ok(sessionStorage.getItem('sic-session-v2'));
  assert.equal(api.user().id,user.id);
 });
 await t.test('email recovery changes the password without the old one, then closes the recovery session',async()=>{
  assert.equal(api.isPasswordRecovery(),true);
  await api.changePassword('replacement-fixture-passphrase');
  const update=calls.findLast(c=>c.url.endsWith('/user')&&c.options.method==='PUT');
  assert.deepEqual(JSON.parse(update.options.body),{password:'replacement-fixture-passphrase'});
  assert.equal(calls.at(-1).url,'https://example.supabase.co/auth/v1/logout');
  assert.equal(api.user(),null);assert.equal(api.isPasswordRecovery(),false);
  assert.equal(sessionStorage.getItem('sic-session-v2'),null);
  const before=calls.length;await assert.rejects(api.changePassword('replacement-fixture-passphrase'),/Accedi/);assert.equal(calls.length,before);
 });
 await t.test('normal changes require the current password and provider mismatch remains generic',async()=>{
  await api.login('fixture@example.test','unit-fixture-passphrase');
  const before=calls.length;
  await assert.rejects(api.changePassword('replacement-fixture-passphrase'),/password attuale/);
  await assert.rejects(api.changePassword('replacement-fixture-passphrase',{recovery:true}),/password attuale/);
  assert.equal(calls.length,before);
  updateError='current_password_mismatch';
  await assert.rejects(api.changePassword('replacement-fixture-passphrase','wrong-fixture-passphrase'),/^Error: La password attuale non è corretta\. Riprova\.$/);
  assert.equal(api.user().id,user.id);assert.equal(api.isPasswordRecovery(),false);
  for(const code of ['same_password','weak_password','reauthentication_needed']){
   updateError=code;await assert.rejects(api.changePassword('replacement-fixture-passphrase','unit-fixture-passphrase'),e=>!e.message.includes('Internal'));
  }
  updateError=null;
  await api.changePassword('replacement-fixture-passphrase','unit-fixture-passphrase');
  const update=calls.findLast(c=>c.url.endsWith('/user')&&c.options.method==='PUT');
  assert.deepEqual(JSON.parse(update.options.body),{password:'replacement-fixture-passphrase',current_password:'unit-fixture-passphrase'});
  assert.equal(api.user(),null);
  assert.ok(!JSON.stringify([...localStorage.data,...sessionStorage.data]).includes('passphrase'));
 });
 await t.test('a normal login after recovery cannot keep the recovery exception',async()=>{
  await api.reset('fixture@example.test');location.href='https://rent-to-a-friend.it/?code=another-fixture';await api.init();
  assert.equal(api.isPasswordRecovery(),true);
  await api.login('fixture@example.test','unit-fixture-passphrase');assert.equal(api.isPasswordRecovery(),false);
  await assert.rejects(api.changePassword('replacement-fixture-passphrase'),/password attuale/);
 });
 await t.test('signup confirmation does not grant recovery privileges',async()=>{
  await api.logout();await api.signup('fixture@example.test','unit-fixture-passphrase','Fixture');
  location.href='https://rent-to-a-friend.it/?code=signup-fixture';assert.equal(await api.init(),false);
  assert.equal(api.isPasswordRecovery(),false);
  await assert.rejects(api.changePassword('replacement-fixture-passphrase'),/password attuale/);
 });
 await t.test('successful password update clears local credentials even if the logout service fails',async()=>{
  logoutError=true;
  await api.changePassword('replacement-fixture-passphrase','unit-fixture-passphrase');
  assert.equal(api.user(),null);assert.equal(api.isPasswordRecovery(),false);
  assert.equal(sessionStorage.getItem('sic-session-v2'),null);logoutError=false;
 });
 await t.test('authenticated requests cannot follow redirects or send browser cookies',async()=>{
  for(const call of calls){assert.ok(call.url.startsWith('https://example.supabase.co/auth/v1/'));assert.equal(call.options.credentials,'omit');assert.equal(call.options.redirect,'error');assert.equal(call.options.referrerPolicy,'no-referrer');}
 });
 await t.test('login errors do not reveal account existence or internal error details',async()=>{
  rejectLogin=true;await assert.rejects(api.login('fixture@example.test','unit-fixture-passphrase'),/^Error: Email o password non corrette\.$/);rejectLogin=false;
 });
 await t.test('logout clears the in-tab session',async()=>{
  await api.logout();assert.equal(api.user(),null);assert.equal(sessionStorage.getItem('sic-session-v2'),null);
 });
});
