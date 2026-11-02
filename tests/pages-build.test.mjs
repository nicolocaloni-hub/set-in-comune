import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {publicAssets,securityHeaders} from '../scripts/assets.mjs';

const script=new URL('../scripts/build-pages.mjs',import.meta.url).pathname;
async function fixture(t){
 const dir=await mkdtemp(join(tmpdir(),'rtaf-pages-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await cp(new URL('../src',import.meta.url),join(dir,'src'),{recursive:true});
 return dir;
}
test('Pages demo preserves response security, canonical auth and the public-only build',async t=>{
 const dir=await fixture(t);
 const result=spawnSync(process.execPath,[script],{cwd:dir,env:{...process.env,PUBLIC_SUPABASE_URL:'',PUBLIC_SUPABASE_ANON_KEY:'',PUBLIC_TURNSTILE_SITE_KEY:'0x4AAAAAAFwUSi7qKbh91gvX'},encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 assert.deepEqual((await readdir(join(dir,'dist'))).sort(),[...publicAssets,'config.js','_headers'].sort());
 const headers=await readFile(join(dir,'dist/_headers'),'utf8');
 for(const [key,value] of Object.entries(securityHeaders()))assert.ok(headers.includes(`  ${key}: ${value}\n`),key);
 const vercel=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
 for(const {key,value} of vercel.headers[0].headers.filter(h=>h.key!=='Content-Security-Policy'))assert.ok(headers.includes(`  ${key}: ${value}\n`),key);
 assert.match(headers,/\/\*\n/);assert.match(headers,/\/sw\.js\n  Cache-Control: no-cache, no-store, must-revalidate\n  Service-Worker-Allowed: \//);
 assert.match(headers,/Content-Type: application\/manifest\+json/);
 assert.doesNotMatch(headers,/https:\/\/challenges\.cloudflare\.com|supabase\.co/);
 assert.match(await readFile(join(dir,'dist/captcha-config.js'),'utf8'),/"siteKey":""/);
 assert.match(await readFile(join(dir,'dist/auth-config.js'),'utf8'),/https:\/\/rent-to-a-friend\.it\//);
 assert.match(await readFile(join(dir,'dist/hosting-config.js'),'utf8'),/'Cloudflare Pages'/);
 const {privacyMarkup}=await import('file://'+join(dir,'dist/privacy.js'));
 assert.match(privacyMarkup(true),/Il sito è distribuito da Cloudflare Pages/);
 assert.match(privacyMarkup(true),/Cloudflare Pages distribuisce il sito/);
 assert.match(privacyMarkup(true),/href="https:\/\/www\.cloudflare\.com\/terms\/">Cloudflare Pages/);
 assert.doesNotMatch(privacyMarkup(true),/Vercel/);
 // Only the provider label and response-header file differ from the Vercel build.
 const before=new Map(await Promise.all([...publicAssets,'config.js'].map(async f=>[f,await readFile(join(dir,'dist',f))])));
 const ordinary=spawnSync(process.execPath,[new URL('../scripts/build.mjs',import.meta.url).pathname],{cwd:dir,env:{...process.env,PUBLIC_SUPABASE_URL:'',PUBLIC_SUPABASE_ANON_KEY:'',PUBLIC_TURNSTILE_SITE_KEY:'0x4AAAAAAFwUSi7qKbh91gvX'},encoding:'utf8'});
 assert.equal(ordinary.status,0,ordinary.stderr);
 for(const [f,bytes] of before)if(f!=='hosting-config.js')assert.deepEqual(await readFile(join(dir,'dist',f)),bytes,f);
 assert.match(await readFile(join(dir,'dist/hosting-config.js'),'utf8'),/'Vercel'/);
});
test('Pages preparation cannot publish a copy without owner approval',async t=>{
 const dir=await fixture(t);
 await cp(new URL('../scripts',import.meta.url),join(dir,'scripts'),{recursive:true});
 await writeFile(join(dir,'package.json'),'{"type":"module"}');
 const privacy=join(dir,'src/privacy.js');await writeFile(privacy,(await readFile(privacy,'utf8'))+'\nprivacySettings.publicationApproved=false;\n');
 const result=spawnSync(process.execPath,[join(dir,'scripts/build-pages.mjs')],{cwd:dir,env:{...process.env,PUBLIC_SUPABASE_URL:'https://example.supabase.co',PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_'+'a'.repeat(32),PUBLIC_TURNSTILE_SITE_KEY:'0x4AAAAAAFwUSi7qKbh91gvX'},encoding:'utf8'});
 assert.notEqual(result.status,0);
 assert.match(result.stderr,/Prima di collegare utenti reali/);
 await assert.rejects(readdir(join(dir,'dist')),{code:'ENOENT'});
});
