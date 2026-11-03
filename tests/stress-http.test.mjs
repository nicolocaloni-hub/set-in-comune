import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

test('stress: isolated static server handles 512 requests at concurrency 32 and refuses private paths',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'rtaf-stress-http-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await cp(new URL('../src',import.meta.url),join(dir,'src'),{recursive:true});
 const built=spawnSync(process.execPath,[new URL('../scripts/build.mjs',import.meta.url).pathname],{cwd:dir,env:{...process.env,PUBLIC_SUPABASE_URL:'',PUBLIC_SUPABASE_ANON_KEY:'',PUBLIC_TURNSTILE_ENABLED:'false'},encoding:'utf8'});
 assert.equal(built.status,0,built.stderr);
 const child=spawn(process.execPath,[new URL('../scripts/serve.mjs',import.meta.url).pathname],{cwd:dir,env:{...process.env,APP_DEV_PORT:'0'},stdio:['ignore','pipe','pipe']});
 t.after(()=>child.kill());
 const base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Local server did not start')),10000);child.once('error',reject);child.stdout.on('data',chunk=>{const match=String(chunk).match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]);}});child.once('exit',code=>{clearTimeout(timer);reject(new Error('Local server exited: '+code));});});
 const paths=['/','/app.js','/api.js','/domain.js','/style.css','/manifest.webmanifest','/config.js','/sw.js'];
 const times=[];let next=0,bytes=0;const start=performance.now();
 await Promise.all(Array.from({length:32},async()=>{while(next<512){const index=next++,at=performance.now();const res=await fetch(base+paths[index%paths.length],{signal:AbortSignal.timeout(10000)});assert.equal(res.status,200);assert.equal(res.headers.get('x-content-type-options'),'nosniff');assert.match(res.headers.get('content-security-policy'),/object-src 'none'/);bytes+=(await res.arrayBuffer()).byteLength;times.push(performance.now()-at);}}));
 const elapsed=performance.now()-start;
 for(const path of ['/.env','/package.json','/supabase/001_initial.sql','/tests/stress-client.test.mjs','/%2e%2e/.env','/%00','/%zz'])assert.equal((await fetch(base+path)).status,404,path);
 assert.equal((await fetch(base+'/',{method:'POST',body:'fixture'})).status,405);
 times.sort((a,b)=>a-b);
 t.diagnostic(JSON.stringify({scope:'isolated Node static server, not Vercel capacity',requests:512,concurrency:32,unexpectedResponses:0,edgeCases:8,bytes,elapsedMs:Math.round(elapsed),medianMs:Math.round(times[255]),p95Ms:Math.round(times[Math.floor(times.length*.95)-1]),p99Ms:Math.round(times[Math.floor(times.length*.99)-1])}));
});
