import test from 'node:test';
import assert from 'node:assert/strict';
import {createDb,A,B,C} from './db-harness.mjs';

test('saved searches are private and alert matching users once per listing',async t=>{
 const {db,as,listing,close}=await createDb({migrations:['migrations/20261107092000_rental_reminders.sql','migrations/20261107093000_saved_searches.sql']});t.after(close);
 const save=(uid,label,filters,alerts=true)=>as(uid,tx=>tx.query('insert into public.saved_searches(label,filters,alerts) values($1,$2::jsonb,$3) returning id',[label,JSON.stringify(filters),alerts])).then(r=>r.rows[0].id);
 const alerts=()=>db.query("select user_id,listing_id from public.notifications where kind='search' order by user_id").then(r=>r.rows);

 await t.test('owners create, read and delete only their own searches',async()=>{
  const id=await save(B,'Camere a Prati',{category:'Camere',zone:'Prati'});
  await save(C,'Luci',{category:'Luci'});
  assert.equal((await as(B,tx=>tx.query('select * from public.saved_searches'))).rows.length,1);
  assert.equal((await as(C,tx=>tx.query('delete from public.saved_searches where id=$1 returning id',[id]))).rows.length,0);
  await assert.rejects(as(null,tx=>tx.query('select * from public.saved_searches'),'anon'),/permission denied/);
  await assert.rejects(as(B,tx=>tx.query('insert into public.saved_searches(user_id,label,filters) values($1,$2,$3::jsonb)',[C,'x',JSON.stringify({query:'x'})])),/permission denied/);
 });
 await t.test('the filter constraint rejects unknown keys, bad types and empty filters',async()=>{
  for(const filters of [{},{start:'2026-11-10'},{max_price:'10'},{max_price:20000},{query:'x'.repeat(81)},{zone:1}])
   await assert.rejects(save(B,'Bad',filters),/saved_search_filters/,JSON.stringify(filters));
 });
 await t.test('a matching new listing notifies the searcher, never the owner',async()=>{
  await save(A,'Le mie camere',{category:'Camere'});
  const l=await listing(A);
  const rows=await alerts();
  assert.deepEqual(rows,[{user_id:B,listing_id:l.id}]);
 });
 await t.test('pausing and republishing does not notify twice; blocked pairs are skipped',async()=>{
  const l=(await alerts())[0].listing_id;
  await as(A,tx=>tx.query('update public.listings set active=false where id=$1',[l]));
  await as(A,tx=>tx.query('update public.listings set active=true where id=$1',[l]));
  assert.equal((await alerts()).length,1);
  await as(C,tx=>tx.query("insert into public.saved_searches(label,filters) values('Tutte le camere','{\"category\":\"Camere\"}')"));
  await as(C,tx=>tx.query('select public.set_user_block($1,true)',[A]));
  await listing(A);
  assert.equal((await alerts()).filter(r=>r.user_id===C).length,0);
 });
 await t.test('disabled alerts and non-matching filters stay silent',async()=>{
  await db.query("delete from public.notifications where kind='search'");
  await db.query('delete from public.saved_searches');
  await save(B,'Silenziosa',{category:'Camere'},false);
  await save(C,'Costose',{max_price:5});
  await listing(A);
  assert.equal((await alerts()).length,0);
 });
 await t.test('search alerts do not inflate unread badges and are exported',async()=>{
  await save(B,'Prati',{zone:'Prati'});
  await listing(A);
  const counts=(await as(B,tx=>tx.query('select public.notification_counts() c'))).rows[0].c;
  assert.equal(counts.messages+counts.requests,0);
  const data=(await as(B,tx=>tx.query('select public.export_my_data() d'))).rows[0].d;
  assert.equal(data.saved_searches.length,2);
 });
 await t.test('at most ten searches per user',async()=>{
  await db.query('delete from public.saved_searches where user_id=$1',[C]);
  for(let i=0;i<10;i++)await save(C,'S'+i,{query:'q'+i});
  await assert.rejects(save(C,'S10',{query:'q10'}),/fino a 10/);
 });
});
