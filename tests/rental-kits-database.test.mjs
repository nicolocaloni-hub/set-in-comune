import test from 'node:test';
import assert from 'node:assert/strict';
import {createDb,A,B,C} from './db-harness.mjs';

const MIGRATIONS=['migrations/20261107090000_profile_portfolio.sql','migrations/20261107091000_duration_pricing.sql','migrations/20261107092000_rental_reminders.sql','migrations/20261107093000_saved_searches.sql','migrations/20261107094000_rental_kits.sql'];
const day=n=>{const d=new Date();d.setUTCHours(12,0,0,0);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};

test('kits: one all-or-nothing request and whole-kit answers',async t=>{
 const {db,as,listing,close}=await createDb({migrations:MIGRATIONS});t.after(close);
 const camera=await listing(A),lens=await listing(A,{weekly_discount_pct:10}),tripod=await listing(A),other=await listing(C);
 const kit=(uid,ids,start=day(10),end=day(12),note='Corto in esterni')=>as(uid,tx=>tx.query('select public.request_bundle($1::uuid[],$2::date,$3::date,$4) id',[ids,start,end,note])).then(r=>r.rows[0].id);
 const count=async where=>(await db.query(`select count(*)::int n from public.bookings where ${where}`)).rows[0].n;

 await t.test('creates one booking per item with the same bundle, note and server prices',async()=>{
  const bundle=await kit(B,[camera.id,lens.id,tripod.id],day(10),day(16));
  const rows=(await db.query('select listing_id,total::float8 total,price_rule,note,status from public.bookings where bundle_id=$1',[bundle])).rows;
  assert.equal(rows.length,3);
  assert.ok(rows.every(r=>r.status==='requested'&&r.note==='Corto in esterni'));
  assert.equal(rows.find(r=>r.listing_id===lens.id).total,126,'7 days × 20 € with 10% weekly discount');
  assert.equal(rows.find(r=>r.listing_id===camera.id).total,140);
  assert.equal((await db.query('select count(*)::int n from public.messages m join public.bookings b on b.id=m.booking_id where b.bundle_id=$1',[bundle])).rows[0].n,1,'the note is sent once');
  assert.equal((await db.query("select count(*)::int n from public.notifications where user_id=$1 and kind='request' and read_at is null",[A])).rows[0].n,1,'one unread request per kit');
 });

 await t.test('rejects mixed owners, single items, duplicates and anonymous callers',async()=>{
  await assert.rejects(kit(B,[camera.id,other.id]),/stesso proprietario/);
  await assert.rejects(kit(B,[camera.id]),/da 2 a 8/);
  await assert.rejects(kit(B,[camera.id,camera.id]),/da 2 a 8/);
  await assert.rejects(as(null,tx=>tx.query('select public.request_bundle($1::uuid[],current_date+10,current_date+11)',[[camera.id,lens.id]]),'anon'),/permission denied/);
  await assert.rejects(kit(A,[camera.id,lens.id]),/tua attrezzatura/);
 });

 await t.test('an unavailable item aborts the whole kit',async()=>{
  const blocking=(await as(C,tx=>tx.query('select (public.request_booking($1,$2::date,$3::date,$4)).id id',[tripod.id,day(30),day(31),'']))).rows[0].id;
  await as(A,tx=>tx.query("select public.transition_booking_checked($1,'accepted','','{}','{}'::jsonb)",[blocking]));
  const before=await count(`renter_id='${B}'`);
  await assert.rejects(kit(B,[camera.id,tripod.id],day(30),day(32)),/non disponibile/);
  assert.equal(await count(`renter_id='${B}'`),before,'no partial kit is left behind');
 });

 await t.test('the owner accepts the whole kit; only accept, decline and cancel apply to it',async()=>{
  const bundle=await kit(B,[camera.id,lens.id],day(40),day(41));
  await assert.rejects(as(B,tx=>tx.query("select public.transition_bundle($1,'accepted')",[bundle])),/non consentito/);
  await assert.rejects(as(A,tx=>tx.query("select public.transition_bundle($1,'collected')",[bundle])),/attrezzo per attrezzo/);
  await assert.rejects(as(C,tx=>tx.query("select public.transition_bundle($1,'accepted')",[bundle])),/Kit non trovato/);
  assert.equal((await as(A,tx=>tx.query("select public.transition_bundle($1,'accepted','Tutto pronto') n",[bundle]))).rows[0].n,2);
  assert.equal(await count(`bundle_id='${bundle}' and status='accepted'`),2);
  await assert.rejects(as(A,tx=>tx.query("select public.transition_bundle($1,'accepted')",[bundle])),/in questo stato/);
  assert.equal((await as(B,tx=>tx.query("select public.transition_bundle($1,'cancelled') n",[bundle]))).rows[0].n,2);
  assert.equal(await count(`bundle_id='${bundle}' and status='cancelled'`),2);
 });

 await t.test('a conflict on one item keeps the whole kit pending',async()=>{
  const bundle=await kit(B,[camera.id,tripod.id],day(50),day(51));
  const single=(await as(C,tx=>tx.query('select (public.request_booking($1,$2::date,$3::date,$4)).id id',[tripod.id,day(51),day(52),'']))).rows[0].id;
  await as(A,tx=>tx.query("select public.transition_booking_checked($1,'accepted','','{}','{}'::jsonb)",[single]));
  await assert.rejects(as(A,tx=>tx.query("select public.transition_bundle($1,'accepted')",[bundle])),/occupate/);
  assert.equal(await count(`bundle_id='${bundle}' and status='requested'`),2);
  assert.equal((await as(A,tx=>tx.query("select public.transition_bundle($1,'declined') n",[bundle]))).rows[0].n,2);
 });

 await t.test('bundle helpers are not callable through the private schema by anonymous clients',async()=>{
  await assert.rejects(as(null,tx=>tx.query("select private.request_bundle(array[$1,$2]::uuid[],current_date+60,current_date+61)",[camera.id,lens.id]),'anon'),/permission denied/);
 });
});
