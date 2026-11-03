import test from 'node:test';
import assert from 'node:assert/strict';
import {rentalDays,validateRental,escapeHtml,validateListing} from '../src/domain.js';

test('stress: 20,000 seeded calendar cases and 10,000 hostile text values preserve boundaries',()=>{
 let seed=20261103;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 for(let i=0;i<20000;i++){
  const year=2090+random()%20,month=random()%15,day=random()%35;
  const date=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const actual=new Date(Date.UTC(year,month-1,day)).toISOString().slice(0,10);
  assert.equal(rentalDays(date,date),actual===date?1:0,date);
  if(actual!==date)assert.throws(()=>validateRental(date,date));
 }
 for(let i=0;i<10000;i++){
  const value=`<img src=x onerror="fixture(${random()})">&'`;
  const escaped=escapeHtml(value);assert.ok(!/[<>"']/.test(escaped));assert.match(escaped,/&lt;img/);
 }
 const data={title:'Camera fixture',category:'Camere',zone:'Prati',description:'Camera esclusivamente per test automatici',accessories:'Borsa',conditions:'Fixture',insurance:'Nessuna',images:[],price:10,deposit:10};
 for(const price of [NaN,Infinity,-Infinity,-1,10001,'',null,'10.999','1e1000'])assert.throws(()=>validateListing({...data,price}));
 for(const deposit of [NaN,Infinity,-1,100001,'',null])assert.throws(()=>validateListing({...data,deposit}));
 assert.throws(()=>validateRental('2090-01-01','2090-03-02'),/60 giorni/);
});
