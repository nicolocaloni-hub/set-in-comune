import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('Storage internal writes retain authenticated ownership, closure checks and all photo quotas',async t=>{
 const db=new PGlite();t.after(()=>db.close());
 await db.exec(`create role anon;create role authenticated;create role supabase_storage_admin bypassrls;
 create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,owner_id text,metadata jsonb default '{}');
 create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;
 alter table storage.objects enable row level security;
 grant usage on schema public,auth,storage to anon,authenticated,supabase_storage_admin;
 grant select,insert,delete on storage.objects to authenticated,supabase_storage_admin;`);
 await db.exec(await readFile(new URL('../supabase/001_initial.sql',import.meta.url),'utf8'));
 await db.exec(`create table private.account_erasure_jobs(user_id uuid primary key);
 create function private.account_open(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$select not exists(select 1 from private.account_erasure_jobs where user_id=p_user)$$;`);
 await db.exec(await readFile(new URL('../supabase/launch/storage_upload_actor.sql',import.meta.url),'utf8'));
 const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',U='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 await db.query("insert into auth.users values($1,now(),'{\"display_name\":\"Fixture A\"}'),($2,now(),'{\"display_name\":\"Fixture B\"}'),($3,null,'{\"display_name\":\"Fixture U\"}')",[A,B,U]);
 let seq=0;
 const upload=(conn,user,owner=user)=>conn.query("insert into storage.objects(bucket_id,name,owner_id) values('profile-photos',$1,$2)",[user+'/'+(++seq)+'.jpg',owner]);
 const client=(uid,fn)=>db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[uid]);return fn(tx);});
 const internal=async fn=>{await db.query("select set_config('request.jwt.claim.sub','',false)");await db.exec('set session authorization supabase_storage_admin');try{return await fn(db);}finally{await db.exec('set session authorization postgres');}};
 await t.test('internal owner-derived writes work without a JWT and count against that owner',async()=>{
  await internal(conn=>upload(conn,A));
  assert.equal((await db.query("select hits from private.action_limits where user_id=$1 and action='photo_upload'",[A])).rows[0].hits,1);
  await client(A,tx=>upload(tx,A));
 });
 await t.test('a client cannot spoof owner_id or take the privileged no-JWT branch',async()=>{
  await assert.rejects(client(A,tx=>upload(tx,A,B)),/non appartenente/);
  await assert.rejects(client('',tx=>upload(tx,A)),/confermata/);
  await assert.rejects(client(B,tx=>upload(tx,A)),/non appartenente/);
  const p=await db.query("select has_function_privilege('authenticated','private.limit_uploads()','EXECUTE') allowed");assert.equal(p.rows[0].allowed,false);
 });
 await t.test('internal writes reject ownerless, mismatched and unconfirmed users',async()=>{
  await assert.rejects(internal(conn=>upload(conn,A,null)),/Proprietario/);
  await assert.rejects(internal(conn=>upload(conn,A,B)),/non appartenente/);
  await assert.rejects(internal(conn=>upload(conn,U)),/confermata/);
 });
 await t.test('closing accounts cannot upload through the internal Storage path',async()=>{
  await db.query('insert into private.account_erasure_jobs values($1)',[A]);
  await assert.rejects(internal(conn=>upload(conn,A)),/confermata/);
  await db.query('delete from private.account_erasure_jobs where user_id=$1',[A]);
 });
 await t.test('the internal path enforces the same thirty uploads per hour',async()=>{
  await db.query("update private.action_limits set hits=30 where user_id=$1 and action='photo_upload'",[A]);
  await assert.rejects(internal(conn=>upload(conn,A)),/Troppe operazioni/);
  await db.query("update private.action_limits set hits=0 where user_id=$1 and action='photo_upload'",[A]);
 });
 await t.test('the internal path enforces per-user and global file caps',async()=>{
  // Synthetic database only: seed quota fixtures without consuming hourly actions.
  await db.exec('alter table storage.objects disable trigger limit_app_photo_uploads');
  await db.query("insert into storage.objects(bucket_id,name) select 'profile-photos',$1||'/cap-'||i from generate_series(1,200-(select count(*)::int from storage.objects where name like $1||'/%')) i",[A]);
  await db.exec('alter table storage.objects enable trigger limit_app_photo_uploads');
  await assert.rejects(internal(conn=>upload(conn,A)),/limite di foto del pilota/);
  await db.exec('alter table storage.objects disable trigger limit_app_photo_uploads');
  await db.query("insert into storage.objects(bucket_id,name) select 'profile-photos','global-fixture/'||i from generate_series(1,1500-(select count(*)::int from storage.objects)) i");
  await db.exec('alter table storage.objects enable trigger limit_app_photo_uploads');
  await assert.rejects(internal(conn=>upload(conn,B)),/Il pilota ha raggiunto/);
 });
});
