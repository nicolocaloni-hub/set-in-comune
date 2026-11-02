import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile,mkdtemp,cp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {escapeHtml} from '../src/domain.js';
const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
function ui({signedIn=false,accountCheck=false}={}){
 let html='';const box={isConnected:true,hidden:true};
 const state={start:'',end:'',listings:[{id:'fixture',owner_id:'owner',title:'Camera',category:'Camere',zone:'Prati',price:25,deposit:100,description:'Descrizione',accessories:'Batteria',conditions:'Buone',insurance:'Nessuna'}]};
 const context={state,api:{user:()=>signedIn?{id:'renter'}:null,authOptions:async()=>({google:false})},config:{accountCheck},isDemo:false,esc:escapeHtml,icon:()=>'',today:()=> '2026-11-02',euro:n=>n+' €',listingGallery:()=>'<div>Foto</div>',calendarMarkup:()=>'<div>Calendario</div>',updateQuote(){},open:s=>{html=s;},modal:{querySelector:()=>box}};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('function authChoices('),source.indexOf('\nfunction calendarMarkup(')),context);
 return {context,html:()=>html,detail:()=>context.detail('fixture'),login:v=>context.loginDialog(v)};
}
test('visitors can inspect item information but receive only explicit sign-in choices for booking and messages',()=>{
 const guest=ui();guest.detail();const html=guest.html();assert.match(html,/Camera/);assert.match(html,/25 €/);assert.match(html,/consultabili senza account/);assert.match(html,/data-action="login"/);assert.match(html,/data-action="signup"/);assert.doesNotMatch(html,/id="booking-form"|data-action="ask-question"|id="rental-calendar"/);
 const member=ui({signedIn:true});member.detail();assert.match(member.html(),/id="booking-form"/);assert.match(member.html(),/data-action="ask-question"/);
});
test('email login and registration have distinct titles, fields and actions; reserved preview never opens signup',()=>{
 const f=ui();f.login(false);assert.match(f.html(),/Accedi al tuo account/);assert.match(f.html(),/data-signup="false"/);assert.doesNotMatch(f.html(),/name="email_confirmation"|name="display_name"/);
 f.login(true);assert.match(f.html(),/Crea il tuo account/);assert.match(f.html(),/data-signup="true"/);assert.match(f.html(),/name="email_confirmation"/);assert.match(f.html(),/Registrati con email/);
 const closed=ui({accountCheck:true});closed.login(true);assert.match(closed.html(),/non è ancora aperta/);assert.doesNotMatch(closed.html(),/id="auth-form"/);
});
test('mismatched registration email stops before calling the signup service',async()=>{
 let handler,calls=0;const err={textContent:''},button={disabled:false};const form={id:'auth-form',dataset:{signup:'true'},classList:{contains:()=>false},querySelector:s=>s==='.form-error'?err:button};
 const ctx={document:{addEventListener:(kind,fn)=>{if(kind==='submit')handler=fn;}},FormData:class{get(k){return {email:'one@example.test',email_confirmation:'two@example.test'}[k];}},api:{signup:async()=>{calls++;}},captcha:{reset(){}},error(e){throw e;}};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf("document.addEventListener('submit'"),source.indexOf("window.addEventListener('hashchange'")),ctx);
 await handler({target:form,submitter:button,preventDefault(){}});assert.equal(calls,0);assert.match(err.textContent,/non coincidono/);assert.equal(button.disabled,false);
});
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
async function client(t,{accountCheck=false,googleCheck=false,redirect=null}={}){
 const dir=await mkdtemp(join(tmpdir(),'rtaf-auth-visitor-'));t.after(()=>rm(dir,{recursive:true,force:true}));await cp(new URL('../src',import.meta.url),join(dir,'src'),{recursive:true});await writeFile(join(dir,'package.json'),'{"type":"module"}');await writeFile(join(dir,'src/config.js'),'export default '+JSON.stringify({url:'https://example.supabase.co',key:'sb_publishable_'+'a'.repeat(32),accountCheck,googleCheck})+';');
 if(redirect)await writeFile(join(dir,'src/auth-config.js'),'export const AUTH_REDIRECT_URL='+JSON.stringify(redirect)+';');
 const originals=Object.fromEntries(['fetch','localStorage','sessionStorage','location','history'].map(k=>[k,globalThis[k]]));t.after(()=>Object.assign(globalThis,originals));globalThis.localStorage=storage();globalThis.sessionStorage=storage();globalThis.location={href:'https://rent-to-a-friend.it/?redirect_to=https://attacker.example',origin:'https://rent-to-a-friend.it'};globalThis.history={replaceState(){}};
 return (await import(pathToFileURL(join(dir,'src/api.js')))).api;
}
test('anonymous clients may read public records but cannot create bookings or messages',async t=>{
 const api=await client(t);let requests=0;globalThis.fetch=async()=>{requests++;return new Response('[]');};
 await api.listings();await api.reviews('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');assert.ok(requests>0);const before=requests;
 await assert.rejects(api.createBooking({},'2026-11-12','2026-11-13',''),/Accedi/);await assert.rejects(api.contactListing({},'Ciao'),/Accedi/);await assert.rejects(api.send('fixture','Ciao'),/Accedi/);assert.equal(requests,before);
});
test('Google uses a fixed callback and PKCE; provider tokens are discarded after code exchange',async t=>{
 const api=await client(t);let enabled=true;const user={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'};
 globalThis.fetch=async url=>new Response(JSON.stringify(url.endsWith('/settings')?{external:{google:enabled}}:url.endsWith('/user')?user:{access_token:'fixture-access',refresh_token:'fixture-refresh',expires_in:3600,user,provider_token:'google-private-fixture',provider_refresh_token:'google-refresh-fixture'}));
 const url=new URL(await api.googleSignInUrl()),flow=JSON.parse(localStorage.getItem('sic-pkce-v1'));
 assert.equal(url.origin,'https://example.supabase.co');assert.equal(url.pathname,'/auth/v1/authorize');assert.equal(url.searchParams.get('provider'),'google');assert.equal(url.searchParams.get('redirect_to'),'https://rent-to-a-friend.it/');assert.equal(url.searchParams.get('scopes'),'openid email profile');assert.equal(url.searchParams.get('code_challenge'),createHash('sha256').update(flow.verifier).digest('base64url'));assert.equal(flow.purpose,'oauth');
 location.href='https://rent-to-a-friend.it/?code=fixture-google-code';assert.equal(await api.init(),false);assert.equal(api.isPasswordRecovery(),false);assert.doesNotMatch(sessionStorage.getItem('sic-session-v2'),/google-private-fixture|google-refresh-fixture|provider_token|provider_refresh_token/);
 enabled=false;await assert.rejects(api.googleSignInUrl(),/non è ancora disponibile/);
 location.origin='https://preview.example';assert.equal((await api.authOptions()).google,false);
});
test('reserved account preview never initiates Google auth or makes provider settings requests',async t=>{
 const api=await client(t,{accountCheck:true});let requests=0;globalThis.fetch=async()=>{requests++;throw Error('Unexpected request');};
 await assert.rejects(api.googleSignInUrl(),/non è ancora disponibile/);assert.equal(requests,0);
});

test('dedicated Google preview uses only its fixed origin and callback',async t=>{
 const redirect='https://set-in-comune-app-git-test-ow-8738e0-nicolocaloni-hubs-projects.vercel.app/';
 const api=await client(t,{accountCheck:true,googleCheck:true,redirect});
 location.origin=new URL(redirect).origin;location.href=redirect+'?redirect_to=https://attacker.example';
 let enabled=false;globalThis.fetch=async()=>new Response(JSON.stringify({external:{google:enabled}}));
 assert.equal((await api.authOptions()).google,false);enabled=true;
 assert.equal((await api.authOptions()).google,true);
 assert.equal(new URL(await api.googleSignInUrl()).searchParams.get('redirect_to'),redirect);
 location.origin='https://rent-to-a-friend.it';assert.equal((await api.authOptions()).google,false);
});
