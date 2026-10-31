import test from 'node:test';
import assert from 'node:assert/strict';
const storage=new Map();
globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
const {api}=await import('../src/api.js');
test('demo supports request, conversation, pickup, return, closure and persistence',async()=>{
 const listing=(await api.listings())[0];
 const b=await api.createBooking(listing,'2090-01-01','2090-01-03','Un cortometraggio.');
 assert.equal(b.total,listing.price*3);
 assert.equal(b.deposit,listing.deposit);
 assert.equal(b.status,'requested');
 assert.equal((await api.messages(b.id))[0].body,'Un cortometraggio.');
 await assert.rejects(api.transition(b.id,'accepted'),/non disponibile/);
 await api.demoAccept(b.id);
 await assert.rejects(api.createBooking(listing,'2090-01-02','2090-01-04',''),/impegnata/);
 await api.send(b.id,'Ritiro alle 9?');
 assert.equal((await api.messages(b.id)).length,3);
 await api.demoHandoff(b.id);
 await api.transition(b.id,'returned','Tutto in ordine',[],{equipment:true,accessories:true,condition:true});
 assert.equal((await api.evidence(b.id)).find(e=>e.stage==='returned').note,'Tutto in ordine');
 await api.demoHandoff(b.id);
 assert.equal((await api.bookings())[0].status,'completed');
 assert.ok(storage.get('sic-demo-v1').includes('completed'));
});
test('own listing cannot be booked; paused listing disappears from search',async()=>{
 const row=await api.publish({title:'Una camera personale',category:'Camere',zone:'Prati',price:10,deposit:20,images:[],description:'Camera di prova per riprese cinematografiche',accessories:'Borsa',conditions:'Ritiro',insurance:'Nessuna'});
 await assert.rejects(api.createBooking(row,'2090-03-01','2090-03-01',''),/tua attrezzatura/);
 await api.toggleListing(row.id,false);
 assert.ok(!(await api.listings()).some(l=>l.id===row.id));
 assert.ok((await api.myListings()).some(l=>l.id===row.id));
});

test('listing edits preserve identity and prior rental agreements; foreign edits fail',async()=>{
 const listing=(await api.listings()).find(l=>l.owner_id!=='demo-me');
 const b=await api.createBooking(listing,'2091-01-01','2091-01-02','Test accordo');
 const original=b.total;
 await assert.rejects(api.updateListing(listing.id,{...listing,price:200}),/non trovato/);
 const own=(await api.myListings())[0];
 const row=await api.updateListing(own.id,{...own,title:'Camera aggiornata per il set',price:35,owner_id:'intruso',blocked:[{start_date:'2091-01-01',end_date:'2091-12-31'}]});
 assert.equal(row.owner_id,'demo-me');
 assert.equal(row.price,35);
 assert.equal(row.active,false);
 assert.equal(row.blocked.length,0);
 assert.equal((await api.bookings()).find(x=>x.id===b.id).total,original);
 await assert.rejects(api.createBooking(listing,'2091-01-01','2091-01-02','Duplicato'),/già inviato/);
});
test('storage quota failures roll back demo edits instead of leaving phantom changes',async()=>{
 const own=(await api.myListings())[0];
 const original=own.title;
 const set=localStorage.setItem;
 localStorage.setItem=()=>{throw new Error('QuotaExceededError');};
 await assert.rejects(api.updateListing(own.id,{...own,title:'Una modifica non salvata'}),/Spazio della demo esaurito/);
 localStorage.setItem=set;
 assert.equal((await api.myListings()).find(l=>l.id===own.id).title,original);
});
test('public profile exposes identity details without email and profile editing preserves other fields',async()=>{
 const before=await api.profile();
 await api.saveProfile({avatar_url:'data:image/jpeg;base64,dGVzdA==',email_verified:true,email:'private@example.com'});
 const p=await api.publicProfile('demo-me');
 assert.equal(p.display_name,before.display_name);
 assert.equal(p.email,undefined);
 assert.equal(p.email_verified,false);
 assert.ok(p.avatar_url);
 await api.saveProfile({display_name:'Nico filmmaker',zone:'Prati',bio:'Appassionato di cinema.'});
 assert.equal((await api.publicProfile('demo-me')).avatar_url,p.avatar_url);
 const other=await api.publicProfile('demo-owner-1');
 assert.equal(other.display_name,'Giulia M.');
 assert.ok((await api.publicListings(other.id)).every(l=>l.owner_id===other.id));
});
test('demo acceptance produces an unread message counter which clears only after opening the chat',async()=>{
 const listing=(await api.listings()).find(l=>l.owner_id!=='demo-me');
 const booking=await api.createBooking(listing,'2092-01-01','2092-01-02','');
 const before=(await api.notificationCounts()).messages;
 await api.demoAccept(booking.id);assert.equal((await api.notificationCounts()).messages,before+1);
 const messages=await api.messages(booking.id);
 await api.readNotifications(booking.id,'message',messages.at(-1).created_at);
 assert.equal((await api.notificationCounts()).messages,before);
});
