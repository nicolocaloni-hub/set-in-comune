import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

test('expired and malformed email flow secrets are removed on the next normal app opening',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'rent-pkce-retention-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await cp(new URL('../src',import.meta.url),join(dir,'src'),{recursive:true});await writeFile(join(dir,'package.json'),'{"type":"module"}');
 await writeFile(join(dir,'src/config.js'),'export default '+JSON.stringify({url:'https://example.supabase.co',key:'sb_publishable_'+'a'.repeat(32)})+';');
 const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 globalThis.sessionStorage={getItem:()=>null,removeItem:()=>{}};globalThis.location={href:'https://rent.example/#search',search:''};
 const oldFetch=globalThis.fetch;globalThis.fetch=()=>{throw new Error('Cleanup must not send the flow secret anywhere');};t.after(()=>globalThis.fetch=oldFetch);
 const {api}=await import(pathToFileURL(join(dir,'src/api.js')));
 for(const value of ['broken JSON',JSON.stringify({verifier:'fixture',created_at:Date.now()-3600001}),JSON.stringify({verifier:'fixture',created_at:Date.now()+60000})]){
  store.set('sic-pkce-v1',value);await api.init();assert.equal(store.has('sic-pkce-v1'),false);
 }
 const current=JSON.stringify({verifier:'fixture',created_at:Date.now(),purpose:'recovery'});store.set('sic-pkce-v1',current);await api.init();assert.equal(store.get('sic-pkce-v1'),current);
});
