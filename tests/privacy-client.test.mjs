import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
test('photo replacement saves first, deletes via Storage API and offers retry on cleanup failure',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'rent-privacy-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await cp(new URL('../src',import.meta.url),join(dir,'src'),{recursive:true});await writeFile(join(dir,'package.json'),'{"type":"module"}');
 const origin='https://example.supabase.co',uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',photo=uid+'/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg';
 await writeFile(join(dir,'src/config.js'),'export default '+JSON.stringify({url:origin,key:'sb_publishable_'+'a'.repeat(32)})+';');
 const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};globalThis.localStorage=storage();globalThis.sessionStorage=storage();globalThis.location={search:''};
 let failDelete=true,removed=false;const calls=[];
 globalThis.fetch=async(url,options)=>{calls.push({url,options});if(url.includes('/auth/v1/token'))return Response.json({access_token:'fixture-token',refresh_token:'fixture-refresh',expires_in:3600,user:{id:uid}});
 if(url.includes('/rest/v1/profiles'))return Response.json(options.method==='PATCH'?[{id:uid,avatar_url:''}]:[{id:uid,avatar_url:origin+'/storage/v1/object/public/profile-photos/'+photo}]);
 if(url.includes('/rpc/unused_uploads'))return Response.json(removed?[]:[{bucket:'profile-photos',path:photo}]);
 if(url.includes('/storage/v1/object/profile-photos')){if(failDelete)return Response.json({}, {status:503});removed=true;return Response.json([{name:photo}]);}
 throw new Error('Unexpected fixture request');};
 const {api}=await import(pathToFileURL(join(dir,'src/api.js')));await api.login('fixture@example.test','fixture-passphrase');
 await api.saveProfile({avatar_url:''});assert.equal(api.photoCleanupPending,true);
 const mutation=calls.findIndex(c=>c.options.method==='PATCH'),deletion=calls.findIndex(c=>c.options.method==='DELETE');assert.ok(mutation>=0&&deletion>mutation);assert.ok(calls[deletion].url.includes('/storage/v1/'));assert.deepEqual(JSON.parse(calls[deletion].options.body).prefixes,[photo]);
 failDelete=false;assert.equal(await api.cleanUnusedUploads(),1);assert.equal(api.photoCleanupPending,false);assert.equal(removed,true);
});
