import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const backend='https://srjdysdhxnafjrutufmk.supabase.co',key='sb_publishable_'+'a'.repeat(32),branch='test/owner-account-check-20261102';
async function fixture(t){const dir=await mkdtemp(join(tmpdir(),'rtaf-account-check-'));t.after(()=>rm(dir,{recursive:true,force:true}));for(const p of ['src','scripts'])await cp(new URL('../'+p,import.meta.url),join(dir,p),{recursive:true});await writeFile(join(dir,'package.json'),'{"type":"module"}');return dir;}
test('closed account check refuses production, other branches, another backend and private keys',async t=>{
 const dir=await fixture(t),env={...process.env,VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:branch,PUBLIC_SUPABASE_URL:backend,PUBLIC_SUPABASE_ANON_KEY:key};
 const run=extra=>spawnSync(process.execPath,['scripts/build-account-check.mjs'],{cwd:dir,env:{...env,...extra},encoding:'utf8'});
 for(const extra of [{VERCEL_ENV:'production'},{VERCEL_ENV:''},{VERCEL_GIT_COMMIT_REF:'main'},{PUBLIC_SUPABASE_URL:'https://other.supabase.co'},{PUBLIC_SUPABASE_ANON_KEY:'private-fixture'}])assert.notEqual(run(extra).status,0);
 const result=run({});assert.equal(result.status,0,result.stderr);
 const config=await readFile(join(dir,'dist/config.js'),'utf8');assert.match(config,/"accountCheck":true/);
 assert.match(await readFile(join(dir,'dist/captcha-config.js'),'utf8'),/"siteKey":""/);
 // A test build never marks privacy, provider checks or legal readiness as approved.
 assert.match(await readFile(join(dir,'dist/service-policy.js'),'utf8'),/approved:false/);
 assert.match(await readFile(join(dir,'dist/privacy.js'),'utf8'),/postalAddressRequired: null/);
 const production=spawnSync(process.execPath,['scripts/build.mjs'],{cwd:dir,env,encoding:'utf8'});assert.notEqual(production.status,0);assert.match(production.stderr,/informativa privacy/);
});
test('account-check client refuses signup, recovery and password changes without making auth requests',async t=>{
 const dir=await fixture(t);await writeFile(join(dir,'src/config.js'),'export default '+JSON.stringify({url:backend,key,accountCheck:true})+';');
 const originals={fetch:globalThis.fetch,localStorage:globalThis.localStorage,sessionStorage:globalThis.sessionStorage};t.after(()=>Object.assign(globalThis,originals));
 const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
 globalThis.localStorage=storage();globalThis.sessionStorage=storage();let requests=0;globalThis.fetch=async()=>{requests++;throw new Error('No request expected');};
 const {api}=await import(pathToFileURL(join(dir,'src/api.js')));
 await assert.rejects(api.signup('fixture@example.test','fixture-passphrase','Fixture'),/già esistenti/);
 await assert.rejects(api.reset('fixture@example.test'),/callback/);
 await assert.rejects(api.changePassword('fixture-passphrase','current-fixture'),/prima prova/);assert.equal(requests,0);
});
