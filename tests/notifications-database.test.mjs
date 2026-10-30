import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('notifications and outbox enforce ownership, preferences, leases and retry semantics',async t=>{
 const db=new PGlite();t.after(()=>db.close());
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create schema storage;create schema vault;create schema net;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('role',current_setting('request.jwt.claim.role',true))$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,metadata jsonb default '{}');
 create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;
 alter table storage.objects enable row level security;
 grant usage on schema public,auth,storage to anon,authenticated,service_role;grant select on storage.objects to anon,authenticated;grant insert,delete on storage.objects to authenticated;
 create table vault.decrypted_secrets(id uuid primary key,decrypted_secret text);
 create table net.requests(id bigserial,url text,body jsonb,headers jsonb);
 create function net.http_post(url text,body jsonb,headers jsonb,timeout_milliseconds integer) returns bigint language plpgsql as $$declare n bigint;begin insert into net.requests(url,body,headers) values(url,body,headers) returning id into n;return n;end;$$;`);
 await db.exec(await readFile(new URL('../supabase/001_initial.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261030174113_notifications.sql',import.meta.url),'utf8'));
 const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',C='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 for(const [id,name] of [[A,'Alice'],[B,'Bruno'],[C,'Carla']])await db.query('insert into auth.users values($1,now(),$2)',[id,JSON.stringify({display_name:name})]);
 const as=(uid,fn,role='authenticated')=>db.transaction(async tx=>{await tx.exec('set local role '+role);await tx.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role',$2,true)",[uid,role]);return fn(tx);});
 const server=fn=>as('',fn,'service_role');
 const secret1='11111111-1111-4111-8111-111111111111',secret2='22222222-2222-4222-8222-222222222222';
 await db.query('insert into vault.decrypted_secrets values($1,$2),($3,$4)',[secret1,'fixture-vapid-private',secret2,'fixture-hook']);
 await db.query("insert into private.push_settings values(true,$1,$2,$3,'https://app.example','https://app.example','https://example.supabase.co/functions/v1/push-dispatch',true)",['B'+'a'.repeat(86),secret1,secret2]);
 const epA='https://fcm.googleapis.com/fcm/send/fixture-a',epB='https://web.push.apple.com/fixture-b';
 const save=(uid,endpoint,messages=true,requests=true)=>as(uid,tx=>tx.query('select public.save_push_subscription($1,$2,$3,$4,$5)',[endpoint,'B'+(uid===A?'a':'b').repeat(86),(uid===A?'a':'b').repeat(22),messages,requests]));
 await save(A,epA);
 const listing=(await as(A,tx=>tx.query("insert into public.listings(owner_id,title,category,zone,description,price,accessories,conditions,images) values($1,'Camera per il set','Camere','Prati','Una camera per il cortometraggio',20,'Borsa','Ritiro concordato',$2) returning id",[A,['https://example.supabase.co/storage/v1/object/public/listing-photos/'+A+'/'+secret1+'.jpg']]))).rows[0].id;
 const booking=(await as(B,tx=>tx.query("select * from public.request_booking($1,'2090-01-01','2090-01-02','Nota iniziale')",[listing]))).rows[0];
 const counts=async uid=>(await as(uid,tx=>tx.query('select public.notification_counts() value'))).rows[0].value;
 await t.test('a request creates exactly one owner notification and one queued push',async()=>{
  assert.equal((await counts(A)).requests,1);assert.equal((await counts(A)).messages,0);assert.equal((await counts(B)).messages,0);
  assert.equal(Number((await db.query('select count(*) n from private.push_jobs')).rows[0].n),1);
  assert.equal(Number((await db.query('select count(*) n from net.requests')).rows[0].n),1);
 });
 await t.test('notifications, subscriptions and dispatch credentials cannot be accessed by a third user',async()=>{
  assert.equal((await as(C,tx=>tx.query('select * from public.notifications'))).rows.length,0);
  await assert.rejects(as(C,tx=>tx.query('select * from private.push_subscriptions')),/permission denied/);
  await assert.rejects(as(C,tx=>tx.query('select public.push_worker_config()')),/permission denied/);
  await assert.rejects(as(C,tx=>tx.query('select public.claim_push_jobs()')),/permission denied/);
  await assert.rejects(as(C,tx=>tx.query('insert into public.notifications(user_id,booking_id,kind) values($1,$2,$3)',[A,booking.id,'message'])),/permission denied/);
  await as(C,tx=>tx.query("select public.read_notifications($1,'request',now())",[booking.id]));assert.equal((await counts(A)).requests,1);
 });
 let first,second;
 await t.test('chat counts are recipient-only; enabling push never sends old messages',async()=>{
  first=(await as(A,tx=>tx.query('insert into public.messages(booking_id,sender_id,body) values($1,$2,$3) returning created_at',[booking.id,A,'Primo messaggio']))).rows[0].created_at;
  assert.equal((await counts(B)).messages,1);assert.equal((await counts(A)).messages,0);
  await save(B,epB,true,false);
  assert.equal(Number((await db.query('select count(*) n from private.push_jobs')).rows[0].n),1);
  second=(await as(A,tx=>tx.query('insert into public.messages(booking_id,sender_id,body) values($1,$2,$3) returning created_at',[booking.id,A,'Secondo messaggio']))).rows[0].created_at;
  assert.equal((await counts(B)).messages,2);assert.equal((await counts(B)).byBooking[booking.id],2);
 });
 await t.test('read cursors do not clear messages that arrived after the rendered cursor',async()=>{
  await as(B,tx=>tx.query("select public.read_notifications($1,'message',$2)",[booking.id,first]));
  assert.equal((await counts(B)).messages,1);
 });
 await t.test('endpoints are allowlisted and another account cannot steal a device with mismatched keys',async()=>{
  for(const endpoint of ['http://127.0.0.1/','https://fcm.googleapis.com.evil.example/x','https://user:pass@fcm.googleapis.com/x','https://localhost/x'])await assert.rejects(save(C,endpoint),/non valida/);
  await assert.rejects(save(B,epA),/non valida/);
  assert.equal((await as(A,tx=>tx.query('select public.push_status($1) value',[epA]))).rows[0].value.enabled,true);
  assert.equal((await as(C,tx=>tx.query('select public.push_status($1) value',[epA]))).rows[0].value.enabled,false);
 });
 let claimed;
 await t.test('only the server can claim jobs; an active lease cannot be claimed twice',async()=>{
  claimed=(await server(tx=>tx.query('select public.claim_push_jobs() value'))).rows[0].value;
  assert.equal(claimed.length,2);assert.ok(claimed.every(j=>j.leaseToken));
  assert.equal((await server(tx=>tx.query('select public.claim_push_jobs() value'))).rows[0].value.length,0);
  const config=(await server(tx=>tx.query('select public.push_worker_config() value'))).rows[0].value;assert.equal(config.hookSecret,'fixture-hook');
 });
 await t.test('expired endpoints are removed and transient delivery errors remain retriable',async()=>{
  const a=claimed.find(j=>j.userId===A),b=claimed.find(j=>j.userId===B);
  await server(tx=>tx.query('select public.finish_push_job($1,$2,410)',[a.jobId,a.leaseToken]));
  assert.equal((await as(A,tx=>tx.query('select public.push_status($1) value',[epA]))).rows[0].value.enabled,false);
  await server(tx=>tx.query('select public.finish_push_job($1,$2,503)',[b.jobId,b.leaseToken]));
  assert.equal((await db.query('select status from private.push_jobs where id=$1',[b.jobId])).rows[0].status,'pending');
  await db.query('update private.push_jobs set next_attempt=now() where id=$1',[b.jobId]);
  const retried=(await server(tx=>tx.query('select public.claim_push_jobs() value'))).rows[0].value[0];assert.notEqual(retried.leaseToken,b.leaseToken);
  await server(tx=>tx.query('select public.finish_push_job($1,$2,201)',[b.jobId,b.leaseToken]));assert.equal((await db.query('select status from private.push_jobs where id=$1',[b.jobId])).rows[0].status,'sending');
  await server(tx=>tx.query('select public.finish_push_job($1,$2,201)',[retried.jobId,retried.leaseToken]));assert.equal((await db.query('select status from private.push_jobs where id=$1',[b.jobId])).rows[0].status,'sent');
 });
 await t.test('disabling message preference avoids queueing while in-app unread counts still work',async()=>{
  await save(B,epB,false,true);
  await as(A,tx=>tx.query('insert into public.messages(booking_id,sender_id,body) values($1,$2,$3)',[booking.id,A,'Messaggio senza push']));
  assert.equal((await counts(B)).messages,2);
  assert.equal(Number((await db.query("select count(*) n from private.push_jobs where status='pending'")).rows[0].n),0);
  await as(B,tx=>tx.query('select public.remove_push_subscription($1)',[epB]));
  assert.equal((await as(B,tx=>tx.query('select public.push_status($1) value',[epB]))).rows[0].value.enabled,false);
 });
});
