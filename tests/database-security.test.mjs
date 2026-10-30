import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('Postgres policies isolate users, guard RPCs and preserve rental agreements',async t=>{
 const db=new PGlite();t.after(()=>db.close());
 // Minimal Auth/Storage schemas, not an emulation of their HTTP services.
 await db.exec(`create role anon;create role authenticated;
 create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,metadata jsonb default '{}');
 create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;
 alter table storage.objects enable row level security;
 grant usage on schema public,auth,storage to anon,authenticated;
 grant select on storage.objects to anon,authenticated;
 grant insert,delete on storage.objects to authenticated;`);
 await db.exec(await readFile(new URL('../supabase/001_initial.sql',import.meta.url),'utf8'));
 const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',C='cccccccc-cccc-4ccc-8ccc-cccccccccccc',D='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
 for(const [id,name,confirmed] of [[A,'Alice',true],[B,'Bruno',true],[C,'Carla',true],[D,'Non confermato',false]])await db.query('insert into auth.users values($1,$2,$3)',[id,confirmed?'2026-01-01':null,JSON.stringify({display_name:name})]);
 const asUser=(uid,fn)=>db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[uid]);return fn(tx);});
 const anonymous=fn=>db.transaction(async tx=>{await tx.exec('set local role anon');await tx.query("select set_config('request.jwt.claim.sub','',true)");return fn(tx);});
 const photo=A+'/11111111-1111-4111-8111-111111111111.jpg';
 await asUser(A,tx=>tx.query("insert into storage.objects(bucket_id,name) values('listing-photos',$1)",[photo]));
 const listing=(await asUser(A,tx=>tx.query(`insert into public.listings(owner_id,title,category,zone,description,price,deposit,accessories,conditions,insurance,images) values($1,'Camera da cinema','Camere','Prati','Camera per piccoli set e cortometraggi',20,100,'Batterie','Ritiro concordato','Nessuna',$2) returning *`,[A,['https://test.supabase.co/storage/v1/object/public/listing-photos/'+photo]]))).rows[0];
 await t.test('unconfirmed accounts cannot publish or upload; email status cannot be forged',async()=>{
  await assert.rejects(asUser(D,tx=>tx.query("insert into storage.objects(bucket_id,name) values('listing-photos',$1)",[D+'/11111111-1111-4111-8111-111111111111.jpg'])),/confermata/);
  await assert.rejects(asUser(B,tx=>tx.query("update public.profiles set email_verified=true where id=$1",[B])),/permission denied/);
 });
 const booking=(await asUser(B,tx=>tx.query("select * from public.request_booking($1,'2090-01-01','2090-01-03','Un cortometraggio')",[listing.id]))).rows[0];
 await t.test('only the two participants can read or write the conversation',async()=>{
  assert.equal((await asUser(C,tx=>tx.query('select * from public.bookings'))).rows.length,0);
  assert.equal((await asUser(C,tx=>tx.query('select * from public.messages'))).rows.length,0);
  assert.equal((await asUser(A,tx=>tx.query('select * from public.bookings'))).rows.length,1);
  await assert.rejects(asUser(C,tx=>tx.query('insert into public.messages(booking_id,sender_id,body) values($1,$2,$3)',[booking.id,C,'Intrusione'])),/row-level security/);
  await assert.rejects(asUser(B,tx=>tx.query("update public.bookings set total=1 where id=$1",[booking.id])),/permission denied/);
 });
 await t.test('ownership, protected columns and RPC permissions cannot be bypassed',async()=>{
  assert.equal((await asUser(B,tx=>tx.query("update public.listings set price=1 where id=$1 returning id",[listing.id]))).rows.length,0);
  await assert.rejects(asUser(A,tx=>tx.query('update public.listings set owner_id=$1 where id=$2',[B,listing.id])),/permission denied/);
  await assert.rejects(asUser(B,tx=>tx.query("select public.transition_booking($1,'accepted')",[booking.id])),/non consentito/);
  await assert.rejects(anonymous(tx=>tx.query("select public.clear_blocks($1)",[listing.id])),/permission denied/);
 });
 await asUser(A,tx=>tx.query("select public.transition_booking($1,'accepted')",[booking.id]));
 await t.test('the public calendar reveals only dates, never private booking records',async()=>{
  const rows=(await anonymous(tx=>tx.query('select * from public.listing_availability'))).rows;
  assert.equal(rows.length,1);assert.deepEqual(Object.keys(rows[0]).sort(),['end_date','listing_id','start_date']);
  await assert.rejects(anonymous(tx=>tx.query('select * from public.bookings')),/permission denied/);
 });
 await t.test('editing an announcement cannot rewrite the saved quote',async()=>{
  await asUser(A,tx=>tx.query("update public.listings set price=40,conditions='Nuove condizioni' where id=$1",[listing.id]));
  const b=(await asUser(B,tx=>tx.query('select * from public.bookings where id=$1',[booking.id]))).rows[0];
  assert.equal(Number(b.total),60);assert.equal(b.conditions,'Ritiro concordato');
 });
 await t.test('accepted dates block conflicting requests and manual blocks',async()=>{
  await assert.rejects(asUser(C,tx=>tx.query("select * from public.request_booking($1,'2090-01-03','2090-01-04','')",[listing.id])),/non disponibile/);
  await assert.rejects(asUser(A,tx=>tx.query("select public.block_dates($1,'2090-01-03','2090-01-04')",[listing.id])),/Esiste già/);
 });
 await t.test('photo evidence cannot be read or attached by unrelated users',async()=>{
  const evidence=B+'/'+booking.id+'/22222222-2222-4222-8222-222222222222.jpg';
  await asUser(B,tx=>tx.query("insert into storage.objects(bucket_id,name) values('handoff-photos',$1)",[evidence]));
  assert.equal((await asUser(C,tx=>tx.query("select * from storage.objects where bucket_id='handoff-photos'"))).rows.length,0);
  await assert.rejects(asUser(C,tx=>tx.query("insert into storage.objects(bucket_id,name) values('handoff-photos',$1)",[C+'/'+booking.id+'/33333333-3333-4333-8333-333333333333.jpg'])),/row-level security/);
  await asUser(A,tx=>tx.query("select public.transition_booking($1,'collected')",[booking.id]));
  await assert.rejects(asUser(B,tx=>tx.query("select public.transition_booking($1,'returned','',array[null]::text[])",[booking.id])),/Foto non appartenenti/);
  await asUser(B,tx=>tx.query("select public.transition_booking($1,'returned','',array[$2])",[booking.id,evidence]));
  assert.equal((await asUser(B,tx=>tx.query("delete from storage.objects where name=$1 returning id",[evidence]))).rows.length,0);
  await asUser(A,tx=>tx.query("select public.transition_booking($1,'completed')",[booking.id]));
  assert.equal((await anonymous(tx=>tx.query('select * from public.listing_availability'))).rows.length,0);
 });
 await t.test('message throttling is enforced by Postgres, including direct API inserts',async()=>{
  for(let i=0;i<4;i++)await asUser(B,tx=>tx.query('insert into public.messages(booking_id,sender_id,body) values($1,$2,$3)',[booking.id,B,'Messaggio '+i]));
  await assert.rejects(asUser(B,tx=>tx.query('insert into public.messages(booking_id,sender_id,body) values($1,$2,$3)',[booking.id,B,'Troppi messaggi'])),/Troppe operazioni/);
 });
 await t.test('privileged trigger and rate-limit functions are not exposed as public RPCs',async()=>{
  const rows=await db.query("select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef");
  assert.equal(rows.rows.length,0);
  await assert.rejects(asUser(B,tx=>tx.query("select private.enforce_rate_limit('message',10000,interval '1 second')")),/permission denied/);
 });
 await t.test('upload throttling and per-user/global pilot quotas also apply to direct inserts',async()=>{
  for(let i=0;i<30;i++)await asUser(C,tx=>tx.query("insert into storage.objects(bucket_id,name) values('profile-photos',$1)",[C+'/'+String(i).padStart(8,'0')+'-0000-4000-8000-000000000000.jpg']));
  await assert.rejects(asUser(C,tx=>tx.query("insert into storage.objects(bucket_id,name) values('profile-photos',$1)",[C+'/99999999-0000-4000-8000-000000000000.jpg'])),/Troppe operazioni/);
  // Only the ephemeral test DB: seed fixture rows without spending its hourly upload quota.
  await db.exec('alter table storage.objects disable trigger limit_app_photo_uploads');
  try{await db.query("insert into storage.objects(bucket_id,name) select 'listing-photos',$1||'/fixture-'||n from generate_series(1,170) n",[C]);}
  finally{await db.exec('alter table storage.objects enable trigger limit_app_photo_uploads');}
  await db.query("update private.action_limits set hits=0 where user_id=$1 and action='photo_upload'",[C]);
  await assert.rejects(asUser(C,tx=>tx.query("insert into storage.objects(bucket_id,name) values('profile-photos',$1)",[C+'/88888888-0000-4000-8000-000000000000.jpg'])),/Hai raggiunto il limite di foto/);
  const count=Number((await db.query('select count(*) as n from storage.objects')).rows[0].n);
  await db.exec('alter table storage.objects disable trigger limit_app_photo_uploads');
  try{await db.query("insert into storage.objects(bucket_id,name) select 'listing-photos','fixture-global/'||n from generate_series(1,$1::int) n",[1500-count]);}
  finally{await db.exec('alter table storage.objects enable trigger limit_app_photo_uploads');}
  await assert.rejects(asUser(B,tx=>tx.query("insert into storage.objects(bucket_id,name) values('profile-photos',$1)",[B+'/77777777-0000-4000-8000-000000000000.jpg'])),/pilota ha raggiunto il limite/);
 });

});
