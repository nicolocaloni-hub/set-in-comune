import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,writeFile,readdir,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync,spawn} from 'node:child_process';
import {validatePublicConfig,safePhotoUrl,resourceId,validPassword} from '../src/security.js';
import {publicAssets} from '../scripts/assets.mjs';

test('public configuration rejects secret keys, arbitrary values and credential-bearing URLs',()=>{
 const url='https://example.supabase.co',key='sb_publishable_'+'a'.repeat(32);
 assert.deepEqual(validatePublicConfig(url,key),{url,key});
 for(const bad of ['sb_'+'secret_'+'a'.repeat(32),'private-password','',JSON.stringify({role:'service_role'})])assert.throws(()=>validatePublicConfig(url,bad));
 for(const bad of ['http://example.supabase.co','https://example.supabase.co/path','https://user:password@example.supabase.co','https://example.supabase.co?token=x','https://example.supabase.co.evil.test'])assert.throws(()=>validatePublicConfig(bad,key));
 const jwt=role=>btoa('{"alg":"HS256"}')+'.'+btoa(JSON.stringify({role}))+'.fixture';
 assert.throws(()=>validatePublicConfig(url,jwt('service_role')));
 assert.equal(validatePublicConfig(url,jwt('anon')).url,url);
});
test('image URLs reject script, SVG, unrelated origins and arbitrary remote paths',()=>{
 const opts={origin:'https://app.example',backend:'https://example.supabase.co',demo:false};
 for(const src of ['javascript:alert(1)','data:image/svg+xml;base64,PHN2Zz4=','https://tracking.example/photo.jpg','https://evil.supabase.co/storage/v1/object/public/profile-photos/aa/bb.jpg','https://example.supabase.co/anything','blob:https://evil.example/id'])assert.equal(safePhotoUrl(src,opts),'');
 assert.ok(safePhotoUrl('https://example.supabase.co/storage/v1/object/public/profile-photos/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/11111111-1111-4111-8111-111111111111.jpg',opts));
 assert.equal(safePhotoUrl('data:image/jpeg;base64,dGVzdA==',{...opts,demo:true}),'data:image/jpeg;base64,dGVzdA==');
 assert.equal(safePhotoUrl('data:image/jpeg;base64,dGVzdA==',opts),'');
});
test('API references cannot inject query filters and password length is bounded',()=>{
 for(const id of ['id&owner_id=eq.other','../../secret','x?select=*',''])assert.throws(()=>resourceId(id));
 assert.ok(resourceId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'));
 assert.throws(()=>validPassword('a'.repeat(129)));assert.throws(()=>validPassword('short'));
});
test('the public build excludes private files and applies an exact-origin CSP',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'sic-build-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await cp(new URL('../src',import.meta.url),join(dir,'src'),{recursive:true});
 await writeFile(join(dir,'src','.env'),'PRIVATE_FIXTURE=should-never-be-public');
 await writeFile(join(dir,'src','backup.dump'),'private fixture');
 const env={...process.env,PUBLIC_SUPABASE_URL:'https://example.supabase.co',PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_'+'a'.repeat(32),PRIVATE_TEST_SENTINEL:'should-never-be-public'};
 const result=spawnSync(process.execPath,[new URL('../scripts/build.mjs',import.meta.url).pathname],{cwd:dir,env,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 assert.deepEqual((await readdir(join(dir,'dist'))).sort(),[...publicAssets,'config.js'].sort());
 const html=await readFile(join(dir,'dist/index.html'),'utf8');
 assert.match(html,/http-equiv="Content-Security-Policy"/);assert.match(html,/connect-src 'self' https:\/\/example.supabase.co/);
 const config=await readFile(join(dir,'dist/config.js'),'utf8');assert.ok(!config.includes(env.PRIVATE_TEST_SENTINEL));
 const server=spawn(process.execPath,[new URL('../scripts/serve.mjs',import.meta.url).pathname],{cwd:dir,env:{...process.env,APP_DEV_PORT:'0'},stdio:['ignore','pipe','pipe']});
 t.after(()=>server.kill());
 const address=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Test server did not start')),4000);server.stdout.once('data',data=>{clearTimeout(timer);resolve(String(data).trim());});server.once('exit',()=>{clearTimeout(timer);reject(new Error('Test server exited'));});});
 for(const path of ['/.env','/.git/config','/supabase/001_initial.sql','/package-lock.json','/../README.md','/%2e%2e%2f.env'])assert.equal((await fetch(address+path)).status,404);
 assert.equal((await fetch(address+'/',{method:'POST'})).status,405);
 const response=await fetch(address+'/',{headers:{Origin:'https://unrelated.example'}});
 assert.equal(response.status,200);assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.equal(response.headers.get('access-control-allow-origin'),null);assert.ok(response.headers.get('content-security-policy').includes('https://example.supabase.co'));
 server.kill();
 const rejected=spawnSync(process.execPath,[new URL('../scripts/build.mjs',import.meta.url).pathname],{cwd:dir,env:{...env,PUBLIC_SUPABASE_ANON_KEY:'sb_'+'secret_'+'x'.repeat(32)},encoding:'utf8'});
 assert.notEqual(rejected.status,0);assert.ok(!rejected.stderr.includes('x'.repeat(32)));
});
