import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const storage=(initial={})=>{const map=new Map(Object.entries(initial));return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};};

test('stress: malformed browser data cannot stop connected startup or publish a false session',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'rtaf-stress-storage-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await cp(new URL('../src',import.meta.url),join(dir,'src'),{recursive:true});
 await writeFile(join(dir,'package.json'),'{"type":"module"}');
 await writeFile(join(dir,'src/config.js'),'export default '+JSON.stringify({url:'https://example.supabase.co',key:'sb_publishable_'+'a'.repeat(32)})+';');
 const malformed=['{','{}','[]','true','1','"old"','{"listings":null}','{"listings":{}}','{"listings":[null]}'];
 let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('Malformed storage must not cause a network request');};
 globalThis.location={href:'https://rent-to-a-friend.it/',origin:'https://rent-to-a-friend.it',search:'',hash:''};
 for(let i=0;i<malformed.length;i++){
  globalThis.localStorage=storage({'sic-demo-v1':malformed[i]});globalThis.sessionStorage=storage({'sic-session-v2':malformed[i]});
  const {api,isDemo}=await import(pathToFileURL(join(dir,'src/api.js'))+'?case='+i);
  assert.equal(isDemo,false);assert.equal(api.user(),null,'invalid session '+i);assert.equal(await api.init(),false);
  assert.equal(localStorage.getItem('sic-demo-v1'),malformed[i],'connected mode leaves old demo data untouched');
 }
 assert.equal(calls,0);
});

test('stress: a capped backend must not silently truncate catalogue, availability or chat history',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'rtaf-stress-pages-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await cp(new URL('../src',import.meta.url),join(dir,'src'),{recursive:true});
 await writeFile(join(dir,'package.json'),'{"type":"module"}');
 await writeFile(join(dir,'src/config.js'),'export default '+JSON.stringify({url:'https://example.supabase.co',key:'sb_publishable_'+'a'.repeat(32)})+';');
 globalThis.localStorage=storage();globalThis.sessionStorage=storage();globalThis.location={href:'https://rent-to-a-friend.it/',origin:'https://rent-to-a-friend.it',search:'',hash:''};
 const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 const listingRows=Array.from({length:1205},(_,i)=>({id:'listing-'+i,active:true,blocked:[]}));
 const periods=Array.from({length:2307},(_,i)=>({listing_id:'listing-'+i%1205,start_date:'2090-01-01',end_date:'2090-01-02'}));
 const messages=Array.from({length:2307},(_,i)=>({id:'message-'+i,created_at:'2090-01-01',body:'Message '+i}));
 let requests=0,failOffset=null,cap=1000;
 globalThis.fetch=async(raw,options)=>{
  const url=new URL(raw);requests++;
  if(url.pathname.startsWith('/auth/'))return Response.json({access_token:'fixture-access',refresh_token:'fixture-refresh',expires_in:3600,user:{id:uid}});
  const rows=url.pathname.endsWith('/listing_availability')?periods:url.pathname.endsWith('/listings')?listingRows:messages;
  const offset=Number(url.searchParams.get('offset')||0),limit=Math.min(cap,Number(url.searchParams.get('limit')||cap));
  if(offset===failOffset)return Response.json({}, {status:503});
  return Response.json(rows.slice(offset,offset+limit));
 };
 const {api}=await import(pathToFileURL(join(dir,'src/api.js')));
 await api.login('fixture@example.test','fixture-test-passphrase');
 const rows=await api.listings();assert.equal(rows.length,1205);
 assert.equal(rows.reduce((n,r)=>n+r.blocked.length,0),2307);
 const chat=await api.messages(uid);assert.equal(chat.length,2307);assert.equal(chat.at(-1).body,'Message 2306');
 cap=137;assert.equal((await api.messages(uid)).length,2307,'server caps smaller than the requested page still work');
 failOffset=137;await assert.rejects(api.messages(uid),/Operazione non riuscita/,'a failed later page must not display partial history as complete');
 assert.ok(requests<60,'requests remain bounded');
});

test('stress: 64 simultaneous reads refresh an expired session exactly once',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'rtaf-stress-refresh-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await cp(new URL('../src',import.meta.url),join(dir,'src'),{recursive:true});
 await writeFile(join(dir,'package.json'),'{"type":"module"}');
 await writeFile(join(dir,'src/config.js'),'export default '+JSON.stringify({url:'https://example.supabase.co',key:'sb_publishable_'+'a'.repeat(32)})+';');
 const user={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',display_name:'Fixture'};
 globalThis.localStorage=storage();globalThis.sessionStorage=storage({'sic-session-v2':JSON.stringify({access_token:'expired-fixture',refresh_token:'fixture-refresh',expires_at:1,user})});
 globalThis.location={href:'https://rent-to-a-friend.it/',origin:'https://rent-to-a-friend.it',search:'',hash:''};
 let refreshes=0,reads=0;
 globalThis.fetch=async(url,options)=>{
  if(url.includes('grant_type=refresh_token')){refreshes++;await new Promise(resolve=>setTimeout(resolve,5));return Response.json({access_token:'renewed-fixture',refresh_token:'new-fixture-refresh',expires_in:3600,user});}
  reads++;assert.equal(options.headers.Authorization,'Bearer renewed-fixture');return Response.json([user]);
 };
 const {api}=await import(pathToFileURL(join(dir,'src/api.js')));
 const profiles=await Promise.all(Array.from({length:64},()=>api.publicProfile(user.id)));
 assert.equal(refreshes,1);assert.equal(reads,64);assert.ok(profiles.every(p=>p.id===user.id));
});

test('stress: 10,000 listings retain all 20,000 availability periods',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'rtaf-stress-large-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await cp(new URL('../src',import.meta.url),join(dir,'src'),{recursive:true});await writeFile(join(dir,'package.json'),'{"type":"module"}');
 await writeFile(join(dir,'src/config.js'),'export default '+JSON.stringify({url:'https://example.supabase.co',key:'sb_publishable_'+'a'.repeat(32)})+';');
 globalThis.localStorage=storage();globalThis.sessionStorage=storage();globalThis.location={search:''};
 const listings=Array.from({length:10000},(_,i)=>({id:'l'+i,blocked:[]}));
 const periods=Array.from({length:20000},(_,i)=>({listing_id:'l'+i%10000,start_date:'2090-01-01',end_date:'2090-01-02'}));
 let calls=0;
 globalThis.fetch=async raw=>{calls++;const u=new URL(raw),rows=u.pathname.endsWith('listing_availability')?periods:listings,offset=Number(u.searchParams.get('offset')||0);return Response.json(rows.slice(offset,offset+500));};
 const {api}=await import(pathToFileURL(join(dir,'src/api.js')));const start=performance.now();const rows=await api.listings();
 assert.equal(rows.length,10000);assert.ok(rows.every(row=>row.blocked.length===2));assert.equal(calls,62);
 t.diagnostic(JSON.stringify({scenario:'mocked API catalogue',listings:10000,periods:20000,pageRequests:calls,elapsedMs:Math.round(performance.now()-start)}));
});
test('stress: old demo records survive normalization while invalid container shapes recover',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'rtaf-stress-demo-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await cp(new URL('../src',import.meta.url),join(dir,'src'),{recursive:true});await writeFile(join(dir,'package.json'),'{"type":"module"}');
 globalThis.location={search:''};globalThis.sessionStorage=storage();
 const cases=[{},[],true,{listings:{},bookings:'old'},{listings:[null,'old'],profile:null}];
 for(let i=0;i<cases.length;i++){
  globalThis.localStorage=storage({'sic-demo-v1':JSON.stringify(cases[i])});
  const {api}=await import(pathToFileURL(join(dir,'src/api.js'))+'?case='+i);assert.ok(Array.isArray(await api.listings()));assert.deepEqual(await api.bookings(),[]);
 }
 const {sampleListings}=await import('../src/data.js');const own={...structuredClone(sampleListings[0]),id:'demo-own',owner_id:'demo-me',title:'Annuncio locale da conservare',active:false};
 globalThis.localStorage=storage({'sic-demo-v1':JSON.stringify({listings:[own],bookings:[],messages:[],profile:{display_name:'Profilo locale',bio:'Bio conservata',zone:'Ostiense'}})});
 const {api}=await import(pathToFileURL(join(dir,'src/api.js'))+'?case=legacy');
 assert.equal((await api.myListings())[0].title,own.title);assert.equal((await api.profile()).bio,'Bio conservata');assert.deepEqual(await api.listings(),[]);
 await api.saveProfile({bio:'Modifica conservata'});assert.equal(JSON.parse(localStorage.getItem('sic-demo-v1')).listings[0].title,own.title);
});
