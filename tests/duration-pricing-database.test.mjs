import test from 'node:test';
import assert from 'node:assert/strict';
import {createDb,A,B} from './db-harness.mjs';
import {quoteRental} from '../src/domain.js';

const nextWeekday=iso=>{const d=new Date();d.setUTCHours(12,0,0,0);d.setUTCDate(d.getUTCDate()+7+((iso-d.getUTCDay()+7)%7));return d;};
const fmt=d=>d.toISOString().slice(0,10),plus=(d,n)=>{const x=new Date(d);x.setUTCDate(x.getUTCDate()+n);return x;};

test('the server computes duration pricing and the client quote matches it',async t=>{
 const {as,listing,close}=await createDb({migrations:['migrations/20261107090000_profile_portfolio.sql','migrations/20261107091000_duration_pricing.sql']});t.after(close);
 const l=await listing(A,{weekend_price:45,weekly_discount_pct:15});
 const request=(start,end)=>as(B,tx=>tx.query('select (b).total::float8 total,(b).price_rule rule from (select public.request_booking($1,$2::date,$3::date,$4) b) x',[l.id,start,end,''])).then(r=>r.rows[0]);
 const friday=nextWeekday(5);

 await t.test('weekend, weekly and daily totals are applied on insert',async()=>{
  const cases=[[friday,plus(friday,2)],[plus(friday,1),plus(friday,3)],[plus(friday,7),plus(friday,13)],[plus(friday,-2),plus(friday,-1)]];
  for(const [s,e] of cases){
   const start=fmt(s),end=fmt(e),server=await request(start,end),client=quoteRental({price:20,weekend_price:45,weekly_discount_pct:15},start,end);
   assert.equal(server.total,client.total,`${start}→${end}`);assert.equal(server.rule,client.rule,`${start}→${end}`);
  }
 });
 await t.test('an edited listing does not rewrite totals already requested',async()=>{
  const before=(await as(B,tx=>tx.query('select total::float8 t from public.bookings order by created_at limit 1'))).rows[0].t;
  await as(A,tx=>tx.query('update public.listings set price=99,weekend_price=null,weekly_discount_pct=0 where id=$1',[l.id]));
  assert.equal((await as(B,tx=>tx.query('select total::float8 t from public.bookings order by created_at limit 1'))).rows[0].t,before);
 });
 await t.test('constraints reject invalid pricing and only owners edit it',async()=>{
  await assert.rejects(as(A,tx=>tx.query('update public.listings set weekly_discount_pct=60 where id=$1',[l.id])),/check/);
  await assert.rejects(as(A,tx=>tx.query('update public.listings set weekend_price=-1 where id=$1',[l.id])),/check/);
  assert.equal((await as(B,tx=>tx.query('update public.listings set weekend_price=1 where id=$1 returning id',[l.id]))).rows.length,0);
 });
 await t.test('pricing helpers are not callable by API clients',async()=>{
  await assert.rejects(as(B,tx=>tx.query("select private.duration_quote(1,1,1,current_date,current_date)")),/permission denied/);
 });
});
