import test from 'node:test';
import assert from 'node:assert/strict';
import {createDb,A,B,C} from './db-harness.mjs';

const D='dddddddd-dddd-4ddd-8ddd-dddddddddddd',E='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const MIGRATIONS=['migrations/20261107090000_profile_portfolio.sql','migrations/20261107091000_duration_pricing.sql','migrations/20261107092000_rental_reminders.sql','migrations/20261107093000_saved_searches.sql','migrations/20261107094000_rental_kits.sql','migrations/20261107100000_six_listing_photos.sql','migrations/20261107110000_admin_account_erasure.sql','migrations/20261107111000_email_notifications.sql'];

async function world(){
 const env=await createDb({migrations:MIGRATIONS,users:[[A,'Alice'],[B,'Bruno'],[C,'Carla'],[D,'Dario']]});
 const {db}=env;
 await db.exec(`alter table auth.users add column email text,add column created_at timestamptz default now(),add column last_sign_in_at timestamptz;
  create table auth.sessions(id uuid primary key default gen_random_uuid(),user_id uuid,updated_at timestamptz,refreshed_at timestamp);
  create table auth.identities(id uuid primary key default gen_random_uuid(),user_id uuid);`);
 await db.query("update auth.users set email=substr(id::text,1,1)||'@example.test',last_sign_in_at=now()");
 return env;
}
const one=(db,q,p=[])=>db.query(q,p).then(r=>r.rows[0]);
const count=(db,q,p=[])=>one(db,q,p).then(r=>Number(r.n));
const request=(as,l,s)=>as(B,tx=>tx.query("select (public.request_booking($1,(current_date+$2::int)::date,(current_date+$2::int+1)::date,'')).id",[l.id,s])).then(r=>r.rows[0].id);

test('booking emails: off by default, then queued, grouped, delayed and capped',async t=>{
 const {db,as,listing,close}=await world();t.after(close);
 const l=await listing(A);
 await request(as,l,1);
 assert.equal(await count(db,'select count(*) n from private.email_events'),0,'switched off: nothing queued');
 await db.query('update private.email_settings set enabled=true');
 const b=await request(as,l,4);
 await as(A,tx=>tx.query("select public.transition_booking($1,'accepted')",[b]));
 assert.deepEqual((await db.query('select user_id,kind from private.email_events order by kind')).rows,[{user_id:B,kind:'accepted'},{user_id:A,kind:'request'}]);
 assert.equal((await one(db,'select private.claim_email_work() w')).w.digests.length,0,'waits 10 minutes before sending');
 await db.query("update private.email_events set created_at=now()-interval '11 minutes'");
 await db.query('update private.email_settings set daily_cap=1');
 const w=(await one(db,'select private.claim_email_work() w')).w;
 assert.equal(w.digests.length,1,'daily cap reached after one email');
 assert.equal(w.digests[0].events[0].title,'Camera di prova');
 assert.ok(!('body' in w.digests[0].events[0]));
 await db.query('select public.finish_email_digest($1,$2,true)',[w.digests[0].userId,w.digests[0].lease]);
 assert.equal(await count(db,'select count(*) n from private.email_log'),1);
 assert.equal((await one(db,'select private.claim_email_work() w')).w.digests.length,0,'the rest waits for tomorrow');
 await db.query("update private.email_log set sent_at=now()-interval '2 days'");
 const next=(await one(db,'select private.claim_email_work() w')).w;
 assert.equal(next.digests.length,1,'next day it goes out');
 await db.query('select public.finish_email_digest($1,$2,false)',[next.digests[0].userId,next.digests[0].lease]);
 assert.equal(await count(db,"select count(*) n from private.email_events where status='pending'"),1,'failed sends are retried');
});

test('messages already read in the app are not emailed; clients cannot use the worker API',async t=>{
 const {db,as,listing,close}=await world();t.after(close);
 await db.query('update private.email_settings set enabled=true');
 const l=await listing(A);const b=await request(as,l,3);
 await as(A,tx=>tx.query("select public.transition_booking($1,'accepted')",[b]));
 await as(B,tx=>tx.query("insert into public.messages(booking_id,sender_id,body) values($1,$2,'Ci sono domani?')",[b,B]));
 await db.query("update public.notifications set read_at=now() where kind='message'");
 await db.query("update private.email_events set created_at=now()-interval '1 hour'");
 await db.query('select private.claim_email_work()');
 assert.equal((await one(db,"select status from private.email_events where kind='message'")).status,'skipped');
 for(const q of ['select public.claim_email_work()','select private.review_inactive_accounts()'])await assert.rejects(as(A,tx=>tx.query(q)),/permission denied/);
 const jobs=(await db.query("select name,schedule from cron.jobs where name like 'rent-to-a-friend-%' order by name")).rows.map(r=>r.name);
 assert.ok(jobs.includes('rent-to-a-friend-emails')&&jobs.includes('rent-to-a-friend-inactive-accounts'));
});

test('inactive accounts: warned after 6 months, reset by a visit, erased or sent to review after 30 days',async t=>{
 const {db,as,listing,close}=await world();t.after(close);
 const l=await listing(A);await request(as,l,2); // A and B share a rental
 await db.query("insert into auth.users(id,email_confirmed_at,raw_user_meta_data,email,created_at) values($1,null,$2,'e@example.test',now()-interval '7 months')",[E,JSON.stringify({display_name:'Elena'})]);
 await db.query("update auth.users set created_at=now()-interval '1 year',last_sign_in_at=now()-interval '7 months' where id in($1,$2,$3)",[A,C,D]);
 await db.query("insert into auth.sessions(user_id,updated_at,refreshed_at) values($1,now()-interval '2 days',now()-interval '2 days')",[C]);
 assert.deepEqual((await one(db,'select private.review_inactive_accounts() r')).r,{},'switched off');
 await db.query('update private.email_settings set inactivity_enabled=true');
 await db.query('select private.review_inactive_accounts()');
 assert.deepEqual((await db.query('select user_id from private.inactivity_notices order by user_id')).rows.map(r=>r.user_id),[A,D],'C stays signed in through a recent session; B is active');
 assert.equal((await one(db,'select mode from private.account_erasure_jobs where user_id=$1',[E])).mode,'standard','never-confirmed signup erased');
 const w=(await one(db,'select private.claim_email_work() w')).w;
 assert.deepEqual(w.inactivity.map(n=>n.email).sort(),['a@example.test','d@example.test']);
 for(const n of w.inactivity)await db.query('select public.finish_inactivity_notice($1,$2,true)',[n.userId,n.lease]);
 assert.equal(await count(db,"select count(*) n from private.email_log where kind='inactivity'"),2);
 await db.query("update private.inactivity_notices set warned_at=now()-interval '31 days'");
 await db.query("update auth.users set last_sign_in_at=now() where id=$1",[D]); // D clicked the link
 await db.query('select private.review_inactive_accounts()');
 assert.equal(await count(db,'select count(*) n from private.inactivity_notices where user_id=$1',[D]),0,'visit resets the clock');
 assert.equal(await count(db,'select count(*) n from private.account_erasure_jobs where user_id=$1',[D]),0);
 assert.equal((await one(db,'select status from private.inactivity_notices where user_id=$1',[A])).status,'review','shared data goes to the operator');
 assert.equal(await count(db,"select count(*) n from private.privacy_requests where user_id=$1 and status='open'",[A]),1);
 assert.equal(await count(db,'select count(*) n from private.account_erasure_jobs where user_id=$1',[A]),0);
});

test('an inactive account with nothing shared is queued for erasure',async t=>{
 const {db,close}=await world();t.after(close);
 await db.query('update private.email_settings set inactivity_enabled=true');
 await db.query("update auth.users set created_at=now()-interval '1 year',last_sign_in_at=now()-interval '8 months' where id=$1",[D]);
 await db.query('select private.review_inactive_accounts()');
 const w=(await one(db,'select private.claim_email_work() w')).w;
 await db.query('select public.finish_inactivity_notice($1,$2,true)',[w.inactivity[0].userId,w.inactivity[0].lease]);
 await db.query("update private.inactivity_notices set warned_at=now()-interval '31 days'");
 await db.query('select private.review_inactive_accounts()');
 assert.equal((await one(db,'select status from private.inactivity_notices where user_id=$1',[D])).status,'erasing');
 assert.equal((await one(db,'select status from private.account_erasure_jobs where user_id=$1',[D])).status,'queued');
});
