-- Pickup and return reminders, sent the day before (Europe/Rome dates) to both
-- participants through the existing push outbox. Reminders follow the "requests"
-- push preference and never count towards unread message/request badges.
-- Apply once. Then redeploy supabase/functions/push-dispatch, which must accept
-- the 'reminder' kind, before the first scheduled run.
begin;
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check(kind in ('message','request','reminder'));
alter table public.notifications add column reminder_stage text check(reminder_stage in ('pickup','return')),
 add constraint reminder_has_stage check((kind='reminder')=(reminder_stage is not null));
create unique index notification_reminder_unique on public.notifications(booking_id,user_id,reminder_stage) where kind='reminder';

create or replace function private.enqueue_push() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into private.push_jobs(notification_id,subscription_id)
 select new.id,s.id from private.push_subscriptions s where s.user_id=new.user_id
  and ((new.kind='message' and s.messages) or(new.kind in ('request','reminder') and s.requests));
 if found then perform private.wake_push_worker();end if;
 return new;
end; $$;

-- Same as the marketplace version, plus reminders and their stage; the badge total
-- counts only messages and requests, which users can mark as read.
create or replace function private.claim_push_jobs() returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Forbidden';end if;
 if not exists(select 1 from private.push_settings where enabled) then return '[]'::jsonb;end if;
 with picked as(select j.id from private.push_jobs j join public.notifications n on n.id=j.notification_id join private.push_subscriptions s on s.id=j.subscription_id
 where n.read_at is null and j.created_at>now()-interval '24 hours' and j.attempts<6 and j.next_attempt<=now() and(j.status='pending' or(j.status='sending' and j.lease_until<now())) and((n.kind='message' and s.messages) or(n.kind in ('request','reminder') and s.requests))
 order by j.created_at for update of j skip locked limit 20),claimed as(update private.push_jobs j set status='sending',attempts=attempts+1,lease_until=now()+interval '2 minutes',lease_token=gen_random_uuid() from picked where j.id=picked.id returning j.*)
 select coalesce(jsonb_agg(jsonb_build_object('jobId',j.id,'leaseToken',j.lease_token,'notificationId',n.id,'userId',n.user_id,'kind',n.kind,'reminderStage',n.reminder_stage,'bookingId',coalesce(n.booking_id,n.conversation_id),'threadType',case when n.conversation_id is not null then 'inquiry' else 'booking' end,'endpoint',s.endpoint,'p256dh',s.p256dh,'auth',s.auth_key,'unreadTotal',(select count(*) from public.notifications x where x.user_id=n.user_id and x.read_at is null and x.kind in ('message','request')))),'[]'::jsonb) into result from claimed j join public.notifications n on n.id=j.notification_id join private.push_subscriptions s on s.id=j.subscription_id;return result;
end;$$;

-- Idempotent: running twice on the same day creates no duplicates.
create function private.queue_rental_reminders(p_today date default (now() at time zone 'Europe/Rome')::date) returns integer
 language plpgsql security definer set search_path='' as $$
declare created integer;
begin
 with due as(
  select b.id,'pickup'::text stage,b.owner_id,b.renter_id from public.bookings b where b.status='accepted' and b.start_date=p_today+1
  union all
  select b.id,'return',b.owner_id,b.renter_id from public.bookings b where b.status='collected' and b.end_date=p_today+1
 ),targets as(
  select id,stage,owner_id user_id from due union all select id,stage,renter_id from due
 ),ins as(
  insert into public.notifications(user_id,booking_id,kind,reminder_stage)
  select user_id,id,'reminder',stage from targets
  on conflict(booking_id,user_id,reminder_stage) where kind='reminder' do nothing returning 1
 ) select count(*) into created from ins;
 return created;
end;$$;
revoke all on function private.queue_rental_reminders(date) from public,anon,authenticated;
-- 16:10 UTC: 17:10 in Rome in winter, 18:10 in summer.
select cron.schedule('rent-to-a-friend-rental-reminders','10 16 * * *','select private.queue_rental_reminders();');
commit;
