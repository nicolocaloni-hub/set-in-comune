import test from 'node:test';
import assert from 'node:assert/strict';
import {isListingId,safeImage,sharePage,loadListing} from '../api/_lib/share.js';
import handler from '../api/share.js';

const SUPA='https://abcd.supabase.co',ORIGIN='https://rent-to-a-friend.it',ID='0b8f1a52-3c1d-4e5f-8a9b-1c2d3e4f5a6b';
const listing={id:ID,title:'Sony FX3 <b>&</b> "kit"',price:45.5,zone:'Prati',owner_name:'Giulia',active:true,archived:false,images:[`${SUPA}/storage/v1/object/public/listing-photos/owner/${ID}.jpg`]};

test('share pages expose only escaped public data and send people to the listing',()=>{
 const html=sharePage({listing,origin:ORIGIN,id:ID,supabaseUrl:SUPA});
 assert.match(html,/<meta property="og:title" content="Sony FX3 &lt;b&gt;&amp;&lt;\/b&gt; &quot;kit&quot; · 45,50\s€\/giorno">/);
 assert.ok(html.includes(`<meta property="og:image" content="${listing.images[0]}">`));
 assert.ok(html.includes(`content="0;url=${ORIGIN}/#search?listing=${ID}"`));
 assert.ok(html.includes(`<meta property="og:url" content="${ORIGIN}/a/${ID}">`));
 assert.ok(!html.includes('<b>'),'no raw HTML from listing data');
 assert.ok(!/<script/i.test(html),'no scripts: works under the site CSP');
});

test('unavailable or foreign data falls back to safe defaults',()=>{
 const gone=sharePage({listing:{...listing,archived:true},origin:ORIGIN,id:ID,supabaseUrl:SUPA});
 assert.match(gone,/Annuncio non disponibile/);assert.match(gone,/content="noindex"/);assert.ok(gone.includes(`url=${ORIGIN}/#search"`));
 const foreign=sharePage({listing:{...listing,images:['https://evil.example/x.jpg']},origin:ORIGIN,id:ID,supabaseUrl:SUPA});
 assert.ok(foreign.includes(`content="${ORIGIN}/icon-512.png"`));
 assert.equal(safeImage(`${SUPA}/storage/v1/object/public/handoff-photos/x.jpg`,SUPA),null,'private buckets are never used');
 assert.equal(isListingId('../etc'),false);assert.equal(isListingId(ID),true);
 const bad=sharePage({listing:null,origin:ORIGIN,id:'"><script>',supabaseUrl:SUPA});
 assert.ok(bad.includes(`content="${ORIGIN}/a/"`));assert.ok(!bad.includes('<script>'));
});

test('listings are read with the anon key and invalid ids never reach the network',async()=>{
 const calls=[];const fetchImpl=async(url,init)=>{calls.push({url,init});return {ok:true,json:async()=>[listing]};};
 assert.equal(await loadListing('nope',{supabaseUrl:SUPA,anonKey:'anon',fetchImpl}),null);
 assert.equal(calls.length,0);
 assert.deepEqual(await loadListing(ID,{supabaseUrl:SUPA,anonKey:'anon',fetchImpl}),listing);
 assert.equal(calls[0].url,`${SUPA}/rest/v1/listings?id=eq.${ID}&select=id,title,price,zone,images,active,archived,owner_name&limit=1`);
 assert.equal(calls[0].init.headers.apikey,'anon');assert.equal(calls[0].init.redirect,'error');
});

test('the Vercel handler answers 404 with a safe page for unknown ids',async()=>{
 const res={headers:{},statusCode:0,body:'',setHeader(k,v){this.headers[k]=v;},status(c){this.statusCode=c;return this;},send(b){this.body=b;}};
 await handler({query:{id:'not-a-uuid'}},res);
 assert.equal(res.statusCode,404);assert.match(res.headers['Content-Type'],/text\/html/);assert.match(res.body,/Annuncio non disponibile/);
});
