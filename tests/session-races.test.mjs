import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const session=(id,expired=false)=>({access_token:'fixture-access-'+id,refresh_token:'fixture-refresh-'+id,expires_at:expired?1:Math.floor(Date.now()/1000)+3600,user:{id}});
const storage=(values={})=>{const m=new Map(Object.entries(values));return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function fixture(t,{expired=false,fetch}={}){
 const dir=await mkdtemp(join(tmpdir(),'rtaf-session-race-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await cp(new URL('../src',import.meta.url),join(dir,'src'),{recursive:true});await writeFile(join(dir,'package.json'),'{"type":"module"}');
 await writeFile(join(dir,'src/config.js'),'export default '+JSON.stringify({url:'https://example.supabase.co',key:'sb_publishable_'+'a'.repeat(32)})+';');
 globalThis.localStorage=storage();globalThis.sessionStorage=storage({'sic-session-v2':JSON.stringify(session(A,expired))});globalThis.location={search:''};globalThis.fetch=fetch;
 return (await import(pathToFileURL(join(dir,'src/api.js')))).api;
}
test('a late refresh cannot restore a logged-out account',async t=>{
 const started=deferred(),refresh=deferred();let reads=0;
 const api=await fixture(t,{expired:true,fetch:async url=>{if(url.includes('grant_type=refresh_token')){started.resolve();return refresh.promise;}if(url.includes('/logout'))return Response.json({});reads++;return Response.json([{id:A}]);}});
 const reading=api.publicProfile(A);const rejected=assert.rejects(reading,/accesso|sessione/i);await started.promise;
 const loggingOut=api.logout();refresh.resolve(Response.json(session(A)));await loggingOut;await rejected;assert.equal(api.user(),null);assert.equal(reads,0);assert.equal(sessionStorage.getItem('sic-session-v2'),null);
});
test('a refresh from the previous account cannot replace a newer login',async t=>{
 const started=deferred(),refresh=deferred();
 const api=await fixture(t,{expired:true,fetch:async url=>{if(url.includes('grant_type=refresh_token')){started.resolve();return refresh.promise;}if(url.includes('grant_type=password'))return Response.json(session(B));return Response.json([{id:A}]);}});
 const rejected=assert.rejects(api.publicProfile(A),/accesso|sessione/i);await started.promise;
 await api.login('fixture-b@example.test','fixture-passphrase');refresh.resolve(Response.json(session(A)));await rejected;assert.equal(api.user().id,B);
});
test('a late 401 from an older session cannot clear the current account',async t=>{
 const started=deferred(),response=deferred();
 const api=await fixture(t,{fetch:async url=>{if(url.includes('grant_type=password'))return Response.json(session(B));started.resolve();return response.promise;}});
 const rejected=assert.rejects(api.publicProfile(A),/accesso|sessione/i);await started.promise;await api.login('fixture-b@example.test','fixture-passphrase');response.resolve(Response.json({}, {status:401}));await rejected;assert.equal(api.user().id,B);
});
test('temporary refresh failure preserves credentials for a later successful retry',async t=>{
 let failing=true,refreshes=0;
 const api=await fixture(t,{expired:true,fetch:async url=>{if(url.includes('grant_type=refresh_token')){refreshes++;return failing?Response.json({}, {status:503}):Response.json(session(A));}return Response.json([{id:A}]);}});
 await assert.rejects(api.publicProfile(A));assert.equal(api.user()?.id,A);assert.ok(sessionStorage.getItem('sic-session-v2'));
 failing=false;assert.equal((await api.publicProfile(A)).id,A);assert.equal(refreshes,2);
});
test('a revoked refresh token still clears the invalid session',async t=>{
 const api=await fixture(t,{expired:true,fetch:async()=>Response.json({code:'refresh_token_not_found'},{status:400})});
 await assert.rejects(api.publicProfile(A));assert.equal(api.user(),null);assert.equal(sessionStorage.getItem('sic-session-v2'),null);
});
test('a profile update affecting no rows cannot report success or remove its old photo',async t=>{
 let deletions=0;
 const api=await fixture(t,{fetch:async(url,options)=>{if(options.method==='DELETE'){deletions++;return Response.json([]);}if(options.method==='PATCH')return Response.json([]);return Response.json([{id:A,avatar_url:'https://example.supabase.co/storage/v1/object/public/profile-photos/'+A+'/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg'}]);}});
 await assert.rejects(api.saveProfile({avatar_url:''}),/profilo|permessi/i);assert.equal(deletions,0);
});
test('a listing update affecting no rows cannot report a successful pause',async t=>{
 const api=await fixture(t,{fetch:async()=>Response.json([])});await assert.rejects(api.toggleListing(A,false),/annuncio|permessi/i);
});
