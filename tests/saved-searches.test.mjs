import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {searchFiltersFromState,describeSearch,validateSavedSearch,matchesSavedSearch} from '../src/marketplace.js';
import {pushPayload} from '../supabase/functions/push-dispatch/core.mjs';

const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',lid='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const camera={title:'Sony FX3 Cinema',description:'Corpo macchina',brand:'Sony',model:'FX3',category:'Camere',zone:'Pigneto',price:60,lens_mount:'Sony E',included_tags:['Batterie'],equipment_condition:'Ottime'};

test('only alert-worthy filters are saved from the catalog state',()=>{
 const f=searchFiltersFromState({query:'  fx3 ',category:'Camere',zone:'Pigneto',max:'80',brand:'Sony',mount:'',accessory:'Batterie',condition:'',start:'2026-11-10',end:'2026-11-12',free:true,onlyFavorites:true,radius:'5'});
 assert.deepEqual(f,{query:'fx3',category:'Camere',zone:'Pigneto',max_price:80,brand:'Sony',accessory:'Batterie'});
 assert.deepEqual(searchFiltersFromState({category:'Tutto',max:''}),{});
 assert.equal(describeSearch(f),'“fx3” · Camere · Sony · con Batterie · a Pigneto · fino a 80 €/giorno');
});

test('validation mirrors the SQL constraint',()=>{
 assert.deepEqual(validateSavedSearch(' FX3 ',{query:'fx3'}),{label:'FX3',filters:{query:'fx3'}});
 for(const [label,filters] of [['',{query:'x'}],['x'.repeat(81),{query:'x'}],['ok',{}],['ok',{start:'2026'}],['ok',{max_price:'10'}],['ok',{max_price:20000}],['ok',{query:'x'.repeat(81)}],['ok',{zone:''}],['ok',null]])
  assert.throws(()=>validateSavedSearch(label,filters),undefined,JSON.stringify([label,filters]));
});

test('matching follows the catalog rules with an exact neighbourhood',()=>{
 assert.ok(matchesSavedSearch({query:'fx3',zone:'Pigneto',max_price:60,brand:'sony',mount:'Sony E',accessory:'Batterie',condition:'Ottime',category:'Camere'},camera));
 assert.ok(!matchesSavedSearch({zone:'San Lorenzo'},camera),'nearby zones do not match');
 assert.ok(!matchesSavedSearch({max_price:59},camera));
 assert.ok(!matchesSavedSearch({accessory:'Monitor'},camera));
 assert.ok(!matchesSavedSearch({query:'canon'},camera));
});

test('search push opens the listing and the worker accepts that link',async()=>{
 assert.deepEqual(pushPayload({kind:'search',userId:uid,listingId:lid,unreadTotal:1}),{kind:'search',userId:uid,url:'/#search?listing='+lid,tag:'search-'+lid,unreadTotal:1});
 assert.throws(()=>pushPayload({kind:'search',userId:uid,listingId:'x'}),/Invalid job/);
 const listeners={},store=new Map(),shown=[];
 const cache={addAll:async()=>{},put:async(k,v)=>store.set(k,v),delete:async k=>store.delete(k)};
 const self={location:{origin:'https://app.example'},addEventListener:(t,fn)=>listeners[t]=fn,skipWaiting:async()=>{},navigator:{},registration:{showNotification:async(...a)=>shown.push(a),getNotifications:async()=>[]},clients:{claim:async()=>{},matchAll:async()=>[],openWindow:async()=>{}}};
 vm.runInNewContext(await readFile(new URL('../src/sw.js',import.meta.url),'utf8'),{self,URL,Response,caches:{open:async()=>cache,match:async k=>store.get(k)?.clone(),keys:async()=>[],delete:async()=>{}},fetch:async()=>new Response('')});
 const dispatch=async(type,data)=>{let pending;listeners[type]({...data,waitUntil:p=>pending=p});await pending;};
 await dispatch('message',{source:{url:'https://app.example/'},data:{type:'BIND_PUSH_USER',userId:uid}});
 await dispatch('push',{data:{json:()=>({kind:'search',userId:uid,url:'/#search?listing='+lid})}});
 assert.equal(shown[0][0],'Nuovo annuncio per te');
 assert.equal(shown[0][1].data.url,'https://app.example/#search?listing='+lid);
});
