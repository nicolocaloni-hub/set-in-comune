import test from 'node:test';
import assert from 'node:assert/strict';
import {createDb,A,B} from './db-harness.mjs';

test('reminders are queued once per participant the day before pickup and return',async t=>{
 const {db,as,listing,close}=await createDb({migrations:['migrations/20261107092000_rental_reminders.sql']});t.after(close);
 const l=await listing(A);
 const request=(start,end)=>as(B,tx=>tx.query("select (public.request_booking($1,(current_date+$2::int)::date,(current_date+$3::int)::date,'')).id",[l.id,start,end])).then(r=>r.rows[0].id);
 const pickupSoon=await request(1,2),returnSoon=await request(4,5),later=await request(10,11),pending=await request(20,21);
 for(const id of [pickupSoon,returnSoon,later])await as(A,tx=>tx.query("select public.transition_booking($1,'accepted')",[id]));
 await as(A,tx=>tx.query("select public.transition_booking_checked($1,'collected','',array[]::text[],'{\"equipment\":true,\"accessories\":true,\"condition\":true}'::jsonb)",[returnSoon]));
 // Pretend "today" is the day before the return of returnSoon (current_date+4) for its stage.
 const queue=day=>db.query('select private.queue_rental_reminders((current_date+$1::int)::date) n',[day]).then(r=>r.rows[0].n);
 const reminders=()=>db.query("select booking_id,user_id,reminder_stage from public.notifications where kind='reminder' order by booking_id,user_id").then(r=>r.rows);

 await t.test('pickup tomorrow: owner and renter, only accepted bookings',async()=>{
  assert.equal(await queue(0),2);
  const rows=await reminders();
  assert.deepEqual(rows.map(r=>[r.booking_id,r.reminder_stage]).sort(),[[pickupSoon,'pickup'],[pickupSoon,'pickup']]);
  assert.deepEqual(rows.map(r=>r.user_id).sort(),[A,B].sort());
 });
 await t.test('running twice creates no duplicates',async()=>{
  assert.equal(await queue(0),0);assert.equal((await reminders()).length,2);
 });
 await t.test('return tomorrow for collected bookings',async()=>{
  assert.equal(await queue(4),2);
  assert.equal((await reminders()).filter(r=>r.booking_id===returnSoon&&r.reminder_stage==='return').length,2);
  assert.equal((await reminders()).some(r=>[later,pending].includes(r.booking_id)),false);
 });
 await t.test('reminders are private to each participant and do not inflate badges',async()=>{
  const mine=await as(B,tx=>tx.query("select count(*)::int n from public.notifications where kind='reminder'"));
  assert.equal(mine.rows[0].n,2);
  const owner=(await as(A,tx=>tx.query('select public.notification_counts() c'))).rows[0].c;
  assert.equal(owner.requests,4,'only the four rental requests count as unread requests');
  const renter=(await as(B,tx=>tx.query('select public.notification_counts() c'))).rows[0].c;
  assert.equal(renter.requests+renter.messages,0);
 });
 await t.test('API clients cannot queue reminders and the job is scheduled',async()=>{
  await assert.rejects(as(B,tx=>tx.query('select private.queue_rental_reminders()')),/permission denied/);
  const job=await db.query("select schedule,command from cron.jobs where name='rent-to-a-friend-rental-reminders'");
  assert.deepEqual(job.rows[0],{schedule:'10 16 * * *',command:'select private.queue_rental_reminders();'});
 });
 await t.test('push jobs follow the request preference',async()=>{
  await db.query("insert into private.push_subscriptions(user_id,endpoint,p256dh,auth_key,messages,requests) values($1,'https://fcm.googleapis.com/x1','k','a',true,true),($2,'https://fcm.googleapis.com/x2','k','a',true,false)",[A,B]);
  await db.query("delete from public.notifications where kind='reminder'");
  await queue(0);
  const jobs=await db.query("select s.user_id from private.push_jobs j join private.push_subscriptions s on s.id=j.subscription_id join public.notifications n on n.id=j.notification_id where n.kind='reminder'");
  assert.deepEqual(jobs.rows.map(r=>r.user_id),[A]);
 });
});
