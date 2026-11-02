import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';

test('legal receipts bind authenticated users to immutable document snapshots and gate new activity',async t=>{
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
 for(const file of ['001_initial.sql','migrations/20261030174113_notifications.sql','migrations/20261031103706_marketplace_trust_and_inquiries.sql'])await db.exec(await readFile(new URL('../supabase/'+file,import.meta.url),'utf8'));
 const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',U='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 await db.query('insert into auth.users values($1,now(),$2),($3,now(),$2),($4,null,$2)',[A,JSON.stringify({display_name:'Fixture',terms_accepted:true}),B,U]);
 const as=(uid,fn,role='authenticated')=>db.transaction(async tx=>{await tx.exec('set local role '+role);await tx.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role',$2,true)",[uid,role]);return fn(tx);});
 const insertListing=tx=>tx.query("insert into public.listings(owner_id,title,category,zone,description,price,accessories,conditions,images) values($1,'Camera di prova','Camere','Prati','Attrezzatura usata soltanto per il test',20,'Borsa','Ritiro concordato',$2) returning id",[A,['https://example.supabase.co/storage/v1/object/public/listing-photos/'+A+'/'+B+'.jpg']]);
 const listing=(await as(A,insertListing)).rows[0].id;
 // Existing obligations must remain manageable when a new version is introduced.
 const booking=(await as(B,tx=>tx.query("select (public.request_booking($1,(current_date+1)::date,(current_date+2)::date,'Prova')).id",[listing]))).rows[0].id;
 await as(A,tx=>tx.query("select public.transition_booking($1,'accepted')",[booking]));
 const pending=(await as(B,tx=>tx.query("select (public.request_booking($1,(current_date+3)::date,(current_date+4)::date,'Prova')).id",[listing]))).rows[0].id;
 await db.exec(await readFile(new URL('../supabase/launch/legal_acceptance.sql',import.meta.url),'utf8'));
 const status=uid=>as(uid,tx=>tx.query('select public.my_legal_status() s')).then(r=>r.rows[0].s);
 const accept=(uid,doc,choices=[true,true,true])=>as(uid,tx=>tx.query('select public.accept_legal_documents($1,$2,$3,$4,$5,$6) s',[doc.version,doc.terms_hash,doc.privacy_hash,...choices])).then(r=>r.rows[0].s);
 await t.test('missing publication fails closed without preventing status or data reads',async()=>{
  assert.deepEqual(await status(A),{available:false,accepted:false});
  await assert.rejects(as(A,insertListing),/condizioni aggiornate/);
  assert.equal((await as(A,tx=>tx.query('select * from public.bookings'))).rows.length,2);
 });
 await db.query("insert into private.legal_releases(version,terms_text,privacy_text,published_at,active) values('v1',$1,$2,now(),true)",['Condizioni di prova immutabili.','Informativa privacy della fixture.']);
 const doc=await status(A);
 assert.equal(doc.terms_hash,createHash('sha256').update(doc.terms_text,'utf8').digest('hex'));
 assert.equal(doc.privacy_hash,createHash('sha256').update(doc.privacy_text,'utf8').digest('hex'));
 await t.test('metadata does not establish acceptance and anonymous/unconfirmed calls are denied',async()=>{
  assert.equal(doc.accepted,false);
  await assert.rejects(as(B,tx=>tx.query("select public.request_booking($1,(current_date+6)::date,(current_date+7)::date,'Nuova richiesta')",[listing])),/condizioni aggiornate/);
  await assert.rejects(as('',tx=>tx.query('select public.my_legal_status()'),'anon'),/permission denied/);
  await assert.rejects(status(U),/email confermata/);
  await assert.rejects(as(A,tx=>tx.query('select * from private.legal_receipts')),/permission denied/);
  await assert.rejects(as(A,tx=>tx.query("insert into private.legal_receipts(user_id,version,terms_accepted,privacy_seen,private_adult) values($1,'v1',true,true,true)",[B])),/permission denied/);
 });
 await t.test('all declarations and exact hashes are required, including null handling',async()=>{
  for(const choices of [[false,true,true],[true,false,true],[true,true,false],[null,true,true]])await assert.rejects(accept(A,doc,choices),/Servono accettazione/);
  await assert.rejects(accept(A,{...doc,terms_hash:'0'.repeat(64)}),/documenti sono cambiati/);
  await assert.rejects(accept(A,{...doc,version:'old'}),/documenti sono cambiati/);
 });
 let first;
 await t.test('receipt identity and server time are stable on retries and scoped to one user',async()=>{
  first=await accept(A,doc);assert.equal(first.accepted,true);assert.ok(first.accepted_at);assert.ok(first.receipt_id);
  const again=await accept(A,doc);assert.equal(again.receipt_id,first.receipt_id);assert.equal(again.accepted_at,first.accepted_at);
  assert.equal((await status(B)).accepted,false);
  const mine=(await as(A,tx=>tx.query('select public.my_legal_receipts() r'))).rows[0].r;
  assert.equal(mine.length,1);assert.equal(mine[0].terms_text,doc.terms_text);assert.equal(mine[0].terms_hash,doc.terms_hash);
  assert.deepEqual((await as(B,tx=>tx.query('select public.my_legal_receipts() r'))).rows[0].r,[]);
 });
 await t.test('published snapshots cannot be edited or deleted even by the publishing connection',async()=>{
  await assert.rejects(db.query("update private.legal_releases set terms_text='Sostituzione non autorizzata del testo' where version='v1'"),/immutabili/);
  await assert.rejects(db.query("delete from private.legal_releases where version='v1'"),/resta archiviata/);
 });
 await t.test('acceptance unlocks new listings and a new release requires a new receipt',async()=>{
  await as(A,insertListing);
  await db.exec("update private.legal_releases set active=false where version='v1';insert into private.legal_releases(version,terms_text,privacy_text,published_at,active) values('v2','Nuove condizioni della fixture.','Nuova informativa della fixture.',now(),true);");
  assert.equal((await status(A)).accepted,false);
  await assert.rejects(as(A,insertListing),/condizioni aggiornate/);
  await assert.rejects(as(A,tx=>tx.query("update public.listings set title='Nuovo titolo camera' where id=$1",[listing])),/condizioni aggiornate/);
  await assert.rejects(accept(A,doc),/documenti sono cambiati/);
  await assert.rejects(as(A,tx=>tx.query("select public.transition_booking($1,'accepted')",[pending])),/condizioni aggiornate/);
 });
 await t.test('version changes preserve existing communications, listing withdrawal and data correction',async()=>{
  await as(A,tx=>tx.query('update public.listings set active=false where id=$1',[listing]));
  await as(A,tx=>tx.query("update public.profiles set bio='Rettifica dati' where id=$1",[A]));
  await assert.rejects(as(A,tx=>tx.query("select private.enforce_rate_limit('profile_edit',99999,interval '1 second')")),/permission denied/);
  await assert.rejects(as(A,tx=>tx.query("update public.profiles set avatar_url='https://foreign.example/photo.jpg' where id=$1",[A])),/foto profilo/);
  await as(A,tx=>tx.query("insert into public.messages(booking_id,sender_id,body) values($1,$2,'Concordiamo la restituzione del noleggio in corso')",[booking,A]));
  assert.equal((await as(A,tx=>tx.query('select * from public.bookings'))).rows.length,2);
 });
 await t.test('publication is unique and user deletion removes the receipt without deleting the texts',async()=>{
  await assert.rejects(db.query("insert into private.legal_releases(version,terms_text,privacy_text,published_at,active) values('v3','Terze condizioni di prova.','Terza privacy di prova.',now(),true)"),/unique/);
  // Independent user with no marketplace relationships, matching automatic-erasure eligibility.
  await db.query('update auth.users set email_confirmed_at=now() where id=$1',[U]);await accept(U,await status(U));
  await db.query('delete from public.profiles where id=$1',[U]);await db.query('delete from auth.users where id=$1',[U]);
  assert.equal((await db.query('select * from private.legal_receipts where user_id=$1',[U])).rows.length,0);
  assert.equal((await db.query('select * from private.legal_releases')).rows.length,2);
 });
});
