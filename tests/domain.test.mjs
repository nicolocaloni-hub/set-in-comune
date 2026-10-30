import test from 'node:test';
import assert from 'node:assert/strict';
import {rentalDays,available,nextActions,validateRental,distance,escapeHtml,zones,filterBookings,validateListing} from '../src/domain.js';
test('billing counts both pickup and return days, including leap years',()=>{
 assert.equal(rentalDays('2028-02-28','2028-03-01'),3);
 assert.equal(rentalDays('2030-11-01','2030-11-01'),1);
 assert.equal(rentalDays('2030-11-03','2030-11-01'),0);
 assert.equal(rentalDays('2030-02-30','2030-03-03'),0);
});
test('rejects past rentals and rentals over sixty days',()=>{
 assert.throws(()=>validateRental('2000-01-01','2000-01-02'));
 assert.throws(()=>validateRental('2090-01-01','2090-04-01'));
 assert.equal(validateRental('2090-01-01','2090-01-02'),2);
});
test('confirmed and manual periods overlap inclusively; pending requests do not reserve',()=>{
 const l={id:'camera',blocked:[{start_date:'2090-01-10',end_date:'2090-01-12'}]};
 assert.equal(available(l,'2090-01-12','2090-01-14'),false);
 assert.equal(available(l,'2090-01-13','2090-01-14'),true);
 const b={listing_id:'camera',start_date:'2090-02-01',end_date:'2090-02-03',status:'requested'};
 assert.equal(available(l,b.start_date,b.end_date,[b]),true);
 assert.equal(available(l,b.start_date,b.end_date,[{...b,status:'accepted'}]),false);
});
test('only the right participant can move the rental forward',()=>{
 assert.deepEqual(nextActions('requested',false),['cancelled']);
 assert.deepEqual(nextActions('requested',true),['accepted','declined']);
 assert.deepEqual(nextActions('collected',false),['returned']);
 assert.deepEqual(nextActions('collected',true),[]);
 assert.deepEqual(nextActions('returned',false),[]);
 assert.deepEqual(nextActions('returned',true),['completed']);
 assert.deepEqual(nextActions('completed',true),[]);
});
test('neighborhood distances are symmetric and bounded; output text is escaped',()=>{
 assert.equal(distance(zones.Prati,zones.Prati),0);
 assert.equal(distance(zones.Prati,zones.Pigneto),distance(zones.Pigneto,zones.Prati));
 assert.ok(distance(zones.Prati,zones.Pigneto)<10);
 assert.equal(escapeHtml('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;');
});

test('booking filters distinguish ownership, open rentals and history',()=>{
 const rows=[{id:1,owner_id:'me',renter_id:'other',status:'requested'},{id:2,owner_id:'other',renter_id:'me',status:'accepted'},{id:3,owner_id:'other',renter_id:'me',status:'completed'}];
 assert.deepEqual(filterBookings(rows,'me','owner','pending').map(x=>x.id),[1]);
 assert.deepEqual(filterBookings(rows,'me','renter','active').map(x=>x.id),[2]);
 assert.deepEqual(filterBookings(rows,'me','all','history').map(x=>x.id),[3]);
});
test('listing validation rejects invalid money, blank fields and excess photos',()=>{
 const row={title:'Camera di prova',description:'Una camera per il tuo cortometraggio',category:'Camere',zone:'Prati',price:0,deposit:0,accessories:'Borsa',conditions:'Ritiro',insurance:'Nessuna',images:[]};
 assert.equal(validateListing(row).price,0);
 for (const price of [NaN,Infinity,-1,1.001,'',null]) assert.throws(()=>validateListing({...row,price}));
 assert.throws(()=>validateListing({...row,conditions:'   '}));
 assert.throws(()=>validateListing({...row,images:['a','b','c','d','e']}));
});
