import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const storage=(values={})=>{const m=new Map(Object.entries(values));return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};};
const login={access_token:'fixture-access',refresh_token:'fixture-refresh',expires_in:3600,user:{id:A}};
let copy=0;
async function load(t,{local={},session={}}={}){
 const dir=await mkdtemp(join(tmpdir(),'rtaf-remember-'+(copy++)+'-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await cp(new URL('../src',import.meta.url),join(dir,'src'),{recursive:true});await writeFile(join(dir,'package.json'),'{"type":"module"}');
 await writeFile(join(dir,'src/config.js'),'export default '+JSON.stringify({url:'https://example.supabase.co',key:'sb_publishable_'+'a'.repeat(32)})+';');
 globalThis.localStorage=storage(local);globalThis.sessionStorage=storage(session);globalThis.location={search:''};
 globalThis.fetch=async url=>String(url).includes('/logout')?new Response(null,{status:204}):Response.json(login);
 return (await import(pathToFileURL(join(dir,'src/api.js')))).api;
}

test('"resta connesso" is on by default and keeps the session after the app is closed',async t=>{
 const api=await load(t);
 assert.equal(api.remembered(),true);
 await api.login('fixture@example.test','fixture-passphrase-1');
 assert.ok(localStorage.getItem('sic-session-v2'));
 assert.equal(sessionStorage.getItem('sic-session-v2'),null);
 const reopened=await load(t,{local:{'sic-session-v2':localStorage.getItem('sic-session-v2')}});
 assert.equal(reopened.user().id,A,'a fresh start (closed app) still has the account');
 await reopened.logout();
 assert.equal(localStorage.getItem('sic-session-v2'),null,'Esci clears the saved session');
});

test('unticked, the session lives only in this tab',async t=>{
 const api=await load(t);
 api.setRemember(false);
 await api.login('fixture@example.test','fixture-passphrase-1');
 assert.equal(localStorage.getItem('sic-session-v2'),null);
 assert.ok(sessionStorage.getItem('sic-session-v2'));
 assert.equal(localStorage.getItem('sic-remember-v1'),'0');
});
