import test from 'node:test';
import assert from 'node:assert/strict';
import {quoteRental,isWeekendRental,validateListing} from '../src/domain.js';

// 2026-11-13 is a Friday.
const listing={price:20,weekend_price:45,weekly_discount_pct:15};

test('weekend price applies only to Fri/Sat pickups returned Sun/Mon within 4 days',()=>{
 assert.ok(isWeekendRental('2026-11-13','2026-11-15'));
 assert.ok(isWeekendRental('2026-11-14','2026-11-15'));
 assert.ok(isWeekendRental('2026-11-14','2026-11-16'));
 assert.ok(isWeekendRental('2026-11-13','2026-11-16'));
 assert.ok(!isWeekendRental('2026-11-12','2026-11-15'),'Thursday pickup');
 assert.ok(!isWeekendRental('2026-11-15','2026-11-16'),'Sunday pickup');
 assert.ok(!isWeekendRental('2026-11-14','2026-11-14'),'single day');
 assert.ok(!isWeekendRental('2026-11-13','2026-11-22'),'more than 4 days');
 assert.deepEqual(quoteRental(listing,'2026-11-13','2026-11-15'),{days:3,total:45,standard:60,rule:'weekend'});
});

test('weekend price is ignored when it is not cheaper',()=>{
 assert.deepEqual(quoteRental({...listing,weekend_price:39},'2026-11-14','2026-11-15'),{days:2,total:39,standard:40,rule:'weekend'});
 assert.deepEqual(quoteRental({...listing,weekend_price:40},'2026-11-14','2026-11-15'),{days:2,total:40,standard:40,rule:'daily'});
 assert.equal(quoteRental({...listing,weekend_price:null},'2026-11-13','2026-11-15').rule,'daily');
 assert.equal(quoteRental({...listing,weekend_price:''},'2026-11-13','2026-11-15').rule,'daily');
});

test('weekly discount from 7 days, rounded to cents like SQL round()',()=>{
 assert.deepEqual(quoteRental(listing,'2026-11-10','2026-11-16'),{days:7,total:119,standard:140,rule:'weekly'});
 assert.equal(quoteRental(listing,'2026-11-10','2026-11-15').rule,'daily');
 // 7 × 12.35 = 86.45; −15% = 73.4825 → 73.48
 assert.equal(quoteRental({price:12.35,weekly_discount_pct:15},'2026-11-01','2026-11-07').total,73.48);
 // 7 × 0.5 = 3.50; −10% = 3.15 exactly
 assert.equal(quoteRental({price:0.5,weekly_discount_pct:10},'2026-11-01','2026-11-07').total,3.15);
 assert.deepEqual(quoteRental({price:0,weekly_discount_pct:50},'2026-11-01','2026-11-30'),{days:30,total:0,standard:0,rule:'weekly'});
});

test('listing validation accepts empty optional pricing and rejects bad values',()=>{
 const base={title:'Titolo valido',description:'Descrizione abbastanza lunga',accessories:'a',conditions:'c',insurance:'i',category:'Camere',zone:'Prati',price:'20',deposit:'0',images:[]};
 const clean=validateListing({...base,weekend_price:'',weekly_discount_pct:''});
 assert.equal(clean.weekend_price,null);assert.equal(clean.weekly_discount_pct,0);
 assert.equal(validateListing({...base,weekend_price:'49.9',weekly_discount_pct:'15'}).weekend_price,49.9);
 for(const bad of [{weekend_price:'-1'},{weekend_price:'10.123'},{weekend_price:'20000'},{weekly_discount_pct:'51'},{weekly_discount_pct:'7.5'},{weekly_discount_pct:'-1'}])
  assert.throws(()=>validateListing({...base,...bad}),/weekend|sconto/i,JSON.stringify(bad));
});
