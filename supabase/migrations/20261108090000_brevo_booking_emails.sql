begin;
-- Booking digests move to Brevo (300 a day on its free plan); Resend keeps Supabase
-- Auth mail and the inactivity notices (Magic Link). Each provider gets its own cap.
alter table private.email_settings drop constraint email_settings_daily_cap_check;
alter table private.email_settings add constraint email_settings_daily_cap_check check(daily_cap between 0 and 300);
alter table private.email_settings add column inactivity_cap integer not null default 40 check(inactivity_cap between 0 and 100);

create function private.emails_sent_today(p_kind text) returns integer language sql stable security definer set search_path='' as $$
 select count(*)::integer from private.email_log where kind=p_kind and sent_at>=(date_trunc('day',now() at time zone 'Europe/Rome') at time zone 'Europe/Rome');
$$;
revoke all on function private.emails_sent_today(text) from public,anon,authenticated;

create or replace function private.claim_email_work() returns jsonb language plpgsql security definer set search_path='' as $$
declare s private.email_settings; budget integer; v_lease uuid:=gen_random_uuid(); digests jsonb:='[]'; notices jsonb:='[]';
begin
 select * into s from private.email_settings;
 update private.email_events e set status='skipped' where e.status in('pending','sending') and(
  e.created_at<now()-interval '3 days' or not private.account_open(e.user_id)
  or exists(select 1 from public.notifications n where n.id=e.notification_id and n.read_at is not null));
 budget:=least(s.daily_cap-private.emails_sent_today('digest'),20);
 if s.enabled and budget>0 then
  with due as(
   select user_id from private.email_events
   where (status='pending' or(status='sending' and lease_until<now()))
    and created_at<=now()-case when kind='message' then interval '30 minutes' else interval '10 minutes' end
   group by user_id order by min(priority),min(created_at) limit budget),
  claimed as(
   update private.email_events e set status='sending',lease=v_lease,lease_until=now()+interval '5 minutes'
   from due where e.user_id=due.user_id and(e.status='pending' or(e.status='sending' and e.lease_until<now())) returning e.*)
  select coalesce(jsonb_agg(jsonb_build_object('userId',c.user_id,'lease',v_lease,'email',u.email,'name',p.display_name,
   'events',(select jsonb_agg(jsonb_build_object('kind',x.kind,'title',x.title,'bookingId',x.booking_id,'conversationId',x.conversation_id) order by x.priority,x.created_at) from claimed x where x.user_id=c.user_id))),'[]')
  into digests
  from(select distinct user_id from claimed) c join auth.users u on u.id=c.user_id join public.profiles p on p.id=c.user_id
  where u.email is not null and u.email_confirmed_at is not null;
 end if;
 budget:=least(s.inactivity_cap-private.emails_sent_today('inactivity'),20);
 if s.inactivity_enabled and budget>0 then
  with picked as(select user_id from private.inactivity_notices where status='pending' or(status='sending' and lease_until<now()) order by updated_at limit budget for update skip locked),
  claimed as(update private.inactivity_notices n set status='sending',lease=v_lease,lease_until=now()+interval '5 minutes',updated_at=now() from picked where n.user_id=picked.user_id returning n.user_id)
  select coalesce(jsonb_agg(jsonb_build_object('userId',c.user_id,'lease',v_lease,'email',u.email)),'[]') into notices
  from claimed c join auth.users u on u.id=c.user_id where u.email is not null;
 end if;
 return jsonb_build_object('appUrl',s.app_url,'digests',digests,'inactivity',notices);
end;$$;
commit;
