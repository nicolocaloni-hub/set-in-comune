import test from 'node:test';
import assert from 'node:assert/strict';
import {createDb,A,B,C} from './db-harness.mjs';

const D='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const MIGRATIONS=['migrations/20261107090000_profile_portfolio.sql','migrations/20261107091000_duration_pricing.sql','migrations/20261107092000_rental_reminders.sql','migrations/20261107093000_saved_searches.sql','migrations/20261107094000_rental_kits.sql','migrations/20261107100000_six_listing_photos.sql','migrations/20261107110000_admin_account_erasure.sql'];

// A owns two listings: rented (L1) and never rented (L2). B rented L1 (completed + reviewed) and has
// an open request on it with a chat message. C asked about L1 in a chat. D did nothing.
async function world(){
 const env=await createDb({migrations:MIGRATIONS,users:[[A,'Alice'],[B,'Bruno'],[C,'Carla'],[D,'Dario']]});
 const {db,as,listing}=env;
 await db.exec('create table auth.identities(id uuid primary key default gen_random_uuid(),user_id uuid)');
 await db.query('insert into auth.identities(user_id) values($1),($2),($3),($4)',[A,B,C,D]);
 const l1=await listing(A),l2=await listing(A);
 const book=(s,e)=>as(B,tx=>tx.query("select (public.request_booking($1,(current_date+$2::int)::date,(current_date+$3::int)::date,'')).id",[l1.id,s,e])).then(r=>r.rows[0].id);
 const done=await book(1,2),open=await book(5,6);
 await db.query("update public.bookings set status='completed' where id=$1",[done]);
 await db.query("insert into public.rental_reviews(booking_id,reviewer_id,reviewee_id,rating,body) values($1,$2,$3,5,'Tutto perfetto')",[done,B,A]);
 await as(A,tx=>tx.query("select public.transition_booking($1,'accepted')",[open]));
 await as(B,tx=>tx.query("insert into public.messages(booking_id,sender_id,body) values($1,$2,'Ciao, a che ora?')",[open,B]));
 await as(C,tx=>tx.query("select public.contact_listing($1,'È ancora disponibile?')",[l1.id]));
 return {...env,l1,l2,done,open};
}
const one=(db,q,p=[])=>db.query(q,p).then(r=>r.rows[0]);
const count=(db,q,p=[])=>one(db,q,p).then(r=>Number(r.n));

test('preview, permissions and the "libero" mode',async t=>{
 const {db,as,close}=await world();t.after(close);
 const p=(await one(db,'select private.admin_erasure_preview($1) p',[A])).p;
 assert.equal(p.annunci,2);assert.equal(p.noleggi_aperti,1);assert.equal(p.noleggi_chiusi,1);assert.equal(p.chat,1);assert.equal(p.recensioni,1);assert.equal(p.dati_condivisi,true);
 for(const q of ['select private.admin_erasure_preview($1)',"select private.admin_erase_account($1,'tutto')"])
  await assert.rejects(as(B,tx=>tx.query(q,[A])),/permission denied/);
 assert.equal((await one(db,"select private.admin_erase_account($1,'libero') r",[A])).r.status,'bloccato');
 assert.equal(await count(db,'select count(*) n from private.account_erasure_jobs'),0);
 assert.deepEqual((await one(db,"select private.admin_erase_account($1,'libero') r",[D])).r,{status:'in_coda'});
 assert.deepEqual(await one(db,'select mode,status from private.account_erasure_jobs where user_id=$1',[D]),{mode:'standard',status:'queued'});
 assert.equal((await one(db,"select private.admin_erase_account($1,'libero') r",[D])).r.status,'in_corso');
 await assert.rejects(db.query("select private.admin_erase_account($1,'boh')",[D]),/Modalità non valida/);
});

test('rentals with equipment out block anonimizza and tutto',async t=>{
 const {db,open,close}=await world();t.after(close);
 await db.query("update public.bookings set status='collected' where id=$1",[open]);
 for(const mode of ['anonimizza','tutto'])assert.equal((await one(db,'select private.admin_erase_account($1,$2) r',[B,mode])).r.status,'bloccato');
 assert.equal(await count(db,"select count(*) n from public.bookings where status='cancelled'"),0);
});

test('anonimizza keeps shared history for the other party and empties the account',async t=>{
 const {db,l1,l2,done,open,close}=await world();t.after(close);
 assert.deepEqual((await one(db,"select private.admin_erase_account($1,'anonimizza') r",[A])).r,{status:'in_coda'});
 assert.equal((await one(db,'select status from public.bookings where id=$1',[open])).status,'cancelled');
 const job=(await one(db,'select private.claim_account_erasures() j')).j[0];
 assert.equal(job.mode,'anonymize');
 await db.query('select public.anonymize_account_records($1,$2)',[A,job.lease]);
 assert.equal(await count(db,'select count(*) n from public.listings where id=$1',[l2.id]),0,'unused listing removed');
 assert.equal(await count(db,'select count(*) n from public.listings where id=$1',[l1.id]),1,'rented listing kept');
 assert.deepEqual(await one(db,'select display_name,bio,avatar_url from public.profiles where id=$1',[A]),{display_name:'Utente eliminato',bio:'',avatar_url:''});
 assert.equal(await count(db,'select count(*) n from public.rental_reviews where booking_id=$1',[done]),1);
 assert.equal(await count(db,'select count(*) n from public.messages where booking_id=$1',[open]),1);
 assert.equal(await count(db,'select count(*) n from auth.identities where user_id=$1',[A]),0);
 assert.equal(await count(db,'select count(*) n from auth.identities where user_id=$1',[B]),1);
 assert.equal((await one(db,'select private.account_open($1) o',[A])).o,false);
 await db.query("update private.account_erasure_jobs set status='done' where user_id=$1",[A]);
 await assert.rejects(db.query('select public.anonymize_account_records($1,$2)',[A,job.lease]),/Lavorazione scaduta/);
});

test('tutto removes shared records so the normal erasure can finish',async t=>{
 const {db,l1,close}=await world();t.after(close);
 assert.deepEqual((await one(db,"select private.admin_erase_account($1,'tutto') r",[B])).r,{status:'in_coda'});
 assert.equal(await count(db,'select count(*) n from public.bookings where renter_id=$1',[B]),0);
 assert.equal(await count(db,'select count(*) n from public.rental_reviews'),0);
 assert.equal(await count(db,'select count(*) n from public.messages'),0);
 assert.equal(await count(db,'select count(*) n from public.inquiries'),1,'C’s chat with A is not B’s data');
 assert.equal(await count(db,'select count(*) n from public.listings where id=$1',[l1.id]),1);
 const job=(await one(db,'select private.claim_account_erasures() j')).j[0];
 assert.equal(job.mode,'standard');
 await db.query('select public.erase_account_records($1,$2)',[B,job.lease]);
 assert.equal(await count(db,'select count(*) n from public.profiles where id=$1',[B]),0);
});
