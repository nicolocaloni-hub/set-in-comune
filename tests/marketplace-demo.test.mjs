import test from 'node:test';import assert from 'node:assert/strict';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
const {api}=await import('../src/api.js');const checks={equipment:true,accessories:true,condition:true};
test('demo questions are reusable independent threads and blocks stop both chat and booking',async()=>{
 const l=(await api.listings())[0];const id=await api.contactListing(l,'La batteria è inclusa?');
 assert.equal((await api.bookings()).length,0);assert.equal((await api.chatThreads())[0].kind,'inquiry');
 assert.equal(await api.contactListing(l,'Grazie, e il caricatore?'),id);assert.equal((await api.messages(id,'inquiry')).length,2);
 await api.setBlock(l.owner_id,true);await assert.rejects(api.send(id,'Un altro messaggio','inquiry'),/ricevere messaggi/);await assert.rejects(api.createBooking(l,'2090-01-01','2090-01-02',''),/Sblocca/);
 await api.submitReport(l.owner_id,'Altro','Descrizione di una segnalazione dimostrativa');assert.equal((await api.safetySettings()).reports.length,1);
 await api.setBlock(l.owner_id,false);await api.send(id,'Ora posso scrivere','inquiry');assert.equal((await api.messages(id,'inquiry')).length,3);
});
test('demo reviews require a completed rental and handoffs retain guided checks',async()=>{
 const l=(await api.listings())[0],b=await api.createBooking(l,'2090-02-01','2090-02-02','Un set');
 await assert.rejects(api.submitReview(b.id,5,'Ottima esperienza e puntualità'),/concluso/);await api.demoAccept(b.id);await api.demoHandoff(b.id);
 await assert.rejects(api.transition(b.id,'returned',''),/controlli/);await api.transition(b.id,'returned','Accessori completi',[],checks);await api.demoHandoff(b.id);
 await api.submitReview(b.id,5,'Ottima esperienza e puntualità');await assert.rejects(api.submitReview(b.id,4,'Seconda recensione dello stesso noleggio'),/già recensito/);
 assert.equal((await api.reputation(l.owner_id)).average_rating,5);assert.equal((await api.publicProfile(l.owner_id)).completed_rentals,1);assert.ok((await api.evidence(b.id)).every(e=>e.checklist.equipment));
});
