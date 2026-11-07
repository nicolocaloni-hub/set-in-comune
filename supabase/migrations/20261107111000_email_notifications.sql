begin;
-- Booking emails and inactive-account notices, sent through Resend by the
-- email-dispatch worker. Resend's free plan allows 100 emails a day shared with
-- Supabase Auth (signup, password reset), so app emails stop at daily_cap and the
-- rest wait for the next day. Both features start switched off.
create table private.email_settings(
 id boolean primary key default true check(id),
 enabled boolean not null default false,
 inactivity_enabled boolean not null default false,
 daily_cap integer not null default 70 check(daily_cap between 0 and 100),
 app_url text not null default 'https://rent-to-a-friend.it' check(app_url ~ '^https://[a-z0-9.-]+$')
);
insert into private.email_settings default values;

create table private.email_events(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 kind text not null check(kind in('request','accepted','declined','cancelled','message','reminder')),
 booking_id uuid, conversation_id uuid,
 notification_id uuid references public.notifications(id) on delete cascade,
 title text not null default '' check(char_length(title)<=120),
 priority smallint not null check(priority between 1 and 3),
 status text not null default 'pending' check(status in('pending','sending','sent','skipped')),
 lease uuid, lease_until timestamptz,
 created_at timestamptz not null default now(), sent_at timestamptz
);
create index email_events_due on private.email_events(status,created_at) where status in('pending','sending');
create table private.email_log(id bigserial primary key,user_id uuid,kind text not null check(kind in('digest','inactivity')),sent_at timestamptz not null default now());
create index email_log_sent on private.email_log(sent_at);
create table private.inactivity_notices(
 user_id uuid primary key references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in('pending','sending','warned','review','erasing')),
 last_seen_at timestamptz not null, warned_at timestamptz,
 lease uuid, lease_until timestamptz, updated_at timestamptz not null default now()
);
alter table private.email_settings enable row level security;
alter table private.email_events enable row level security;
alter table private.email_log enable row level security;
alter table private.inactivity_notices enable row level security;
revoke all on private.email_settings,private.email_events,private.email_log,private.inactivity_notices from public,anon,authenticated;

-- Events -------------------------------------------------------------------
create function private.email_on_notification() returns trigger language plpgsql security definer set search_path='' as $$
declare t text;
begin
 if new.kind not in('request','message','reminder') or not(select enabled from private.email_settings) then return new;end if;
 if new.booking_id is not null then select title into t from public.bookings where id=new.booking_id;
 else select title into t from public.inquiries where id=new.conversation_id;end if;
 insert into private.email_events(user_id,kind,booking_id,conversation_id,notification_id,title,priority)
 values(new.user_id,new.kind,new.booking_id,new.conversation_id,new.id,left(coalesce(t,''),120),case when new.kind='message' then 2 else 1 end);
 return new;
end;$$;
create trigger email_on_notification after insert on public.notifications for each row execute function private.email_on_notification();

create function private.email_on_booking_status() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.status is not distinct from old.status or not(select enabled from private.email_settings) then return new;end if;
 if new.status in('accepted','declined') then
  insert into private.email_events(user_id,kind,booking_id,title,priority) values(new.renter_id,new.status,new.id,left(new.title,120),1);
 elsif new.status='cancelled' then
  insert into private.email_events(user_id,kind,booking_id,title,priority)
  select u,'cancelled',new.id,left(new.title,120),1 from unnest(array[new.owner_id,new.renter_id]) u where u is distinct from auth.uid();
 end if;
 return new;
end;$$;
create trigger email_on_booking_status after update of status on public.bookings for each row execute function private.email_on_booking_status();

-- Worker interface ---------------------------------------------------------
create function private.emails_sent_today() returns integer language sql stable security definer set search_path='' as $$
 select count(*)::integer from private.email_log where sent_at>=(date_trunc('day',now() at time zone 'Europe/Rome') at time zone 'Europe/Rome');
$$;

create function private.claim_email_work() returns jsonb language plpgsql security definer set search_path='' as $$
declare s private.email_settings; budget integer; v_lease uuid:=gen_random_uuid(); digests jsonb:='[]'; notices jsonb:='[]';
begin
 select * into s from private.email_settings;
 budget:=least(s.daily_cap-private.emails_sent_today(),20);
 -- Nothing worth sending: too old, already read in the app, or account closing.
 update private.email_events e set status='skipped' where e.status in('pending','sending') and(
  e.created_at<now()-interval '3 days' or not private.account_open(e.user_id)
  or exists(select 1 from public.notifications n where n.id=e.notification_id and n.read_at is not null));
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
  budget:=budget-jsonb_array_length(digests);
 end if;
 if s.inactivity_enabled and budget>0 then
  with picked as(select user_id from private.inactivity_notices where status='pending' or(status='sending' and lease_until<now()) order by updated_at limit budget for update skip locked),
  claimed as(update private.inactivity_notices n set status='sending',lease=v_lease,lease_until=now()+interval '5 minutes',updated_at=now() from picked where n.user_id=picked.user_id returning n.user_id)
  select coalesce(jsonb_agg(jsonb_build_object('userId',c.user_id,'lease',v_lease,'email',u.email)),'[]') into notices
  from claimed c join auth.users u on u.id=c.user_id where u.email is not null;
 end if;
 return jsonb_build_object('appUrl',s.app_url,'digests',digests,'inactivity',notices);
end;$$;

create function private.finish_email_digest(p_user uuid,p_lease uuid,p_ok boolean) returns void language plpgsql security definer set search_path='' as $$begin
 update private.email_events set status=case when p_ok then 'sent' else 'pending' end,sent_at=case when p_ok then now() end,lease=null,lease_until=null
 where user_id=p_user and lease=p_lease and status='sending';
 if p_ok and found then insert into private.email_log(user_id,kind) values(p_user,'digest');end if;
end;$$;

create function private.finish_inactivity_notice(p_user uuid,p_lease uuid,p_ok boolean) returns void language plpgsql security definer set search_path='' as $$begin
 update private.inactivity_notices set status=case when p_ok then 'warned' else 'pending' end,warned_at=case when p_ok then now() else warned_at end,lease=null,lease_until=null,updated_at=now()
 where user_id=p_user and lease=p_lease and status='sending';
 if p_ok and found then insert into private.email_log(user_id,kind) values(p_user,'inactivity');end if;
end;$$;

-- Inactive accounts: 6 months without use, then an email; 30 days later the
-- account is erased unless it shares data with others (then the operator decides).
create function private.last_seen(p_user uuid) returns timestamptz language sql stable security definer set search_path='' as $$
 select greatest(u.created_at,u.last_sign_in_at,(select max(coalesce(s.refreshed_at,s.updated_at)) from auth.sessions s where s.user_id=u.id)) from auth.users u where u.id=p_user;
$$;

create function private.review_inactive_accounts() returns jsonb language plpgsql security definer set search_path='' as $$
declare r record; warned integer:=0; erased integer:=0; reviewed integer:=0;
begin
 if not(select inactivity_enabled from private.email_settings) then return '{}'::jsonb;end if;
 -- Back in the app (login or the email's link): the clock starts again.
 delete from private.inactivity_notices n where n.status in('pending','sending','warned') and private.last_seen(n.user_id)>n.last_seen_at;
 insert into private.inactivity_notices(user_id,last_seen_at)
 select u.id,private.last_seen(u.id) from auth.users u
 where u.email_confirmed_at is not null and private.account_open(u.id) and private.last_seen(u.id)<now()-interval '6 months'
  and not exists(select 1 from private.inactivity_notices n where n.user_id=u.id)
 on conflict do nothing;
 get diagnostics warned=row_count;
 -- Never-confirmed signups can hold no data: erase them without an email.
 for r in select u.id from auth.users u where u.email_confirmed_at is null and u.created_at<now()-interval '6 months' and private.account_open(u.id) loop
  perform private.admin_queue_erasure(r.id,'standard');erased:=erased+1;
 end loop;
 for r in select n.user_id from private.inactivity_notices n where n.status='warned' and n.warned_at<now()-interval '30 days' for update loop
  if private.erasure_needs_review(r.user_id) then
   insert into private.privacy_requests(user_id,response) values(r.user_id,'Account inattivo da oltre 6 mesi e avvisato da 30 giorni: ha dati condivisi, decide il gestore.')
   on conflict(user_id) where status in('open','reviewing') do nothing;
   update private.inactivity_notices set status='review',updated_at=now() where user_id=r.user_id;reviewed:=reviewed+1;
  else
   perform private.admin_queue_erasure(r.user_id,'standard');
   update private.inactivity_notices set status='erasing',updated_at=now() where user_id=r.user_id;erased:=erased+1;
  end if;
 end loop;
 return jsonb_build_object('new_notices',warned,'erasures',erased,'reviews',reviewed);
end;$$;

-- Wake the worker only when there is something to send.
create function private.dispatch_emails() returns void language plpgsql security definer set search_path='' as $$declare secret text;target text;begin
 if not exists(select 1 from private.email_events where status='pending' or(status='sending' and lease_until<now()))
  and not exists(select 1 from private.inactivity_notices where status='pending' or(status='sending' and lease_until<now())) then return;end if;
 select regexp_replace(s.worker_url,'/push-dispatch$','/email-dispatch'),h.decrypted_secret into target,secret from private.push_settings s join vault.decrypted_secrets h on h.id=s.hook_secret where s.id;
 if target is not null and secret is not null then perform net.http_post(url:=target,body:='{}'::jsonb,headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),timeout_milliseconds:=5000);end if;
exception when others then null;
end;$$;

create function public.claim_email_work() returns jsonb language sql security invoker set search_path='' as $$select private.claim_email_work();$$;
create function public.finish_email_digest(p_user uuid,p_lease uuid,p_ok boolean) returns void language sql security invoker set search_path='' as $$select private.finish_email_digest(p_user,p_lease,p_ok);$$;
create function public.finish_inactivity_notice(p_user uuid,p_lease uuid,p_ok boolean) returns void language sql security invoker set search_path='' as $$select private.finish_inactivity_notice(p_user,p_lease,p_ok);$$;
revoke all on function private.email_on_notification(),private.email_on_booking_status(),private.emails_sent_today(),private.claim_email_work(),private.finish_email_digest(uuid,uuid,boolean),private.finish_inactivity_notice(uuid,uuid,boolean),private.last_seen(uuid),private.review_inactive_accounts(),private.dispatch_emails(),public.claim_email_work(),public.finish_email_digest(uuid,uuid,boolean),public.finish_inactivity_notice(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function private.claim_email_work(),private.finish_email_digest(uuid,uuid,boolean),private.finish_inactivity_notice(uuid,uuid,boolean),public.claim_email_work(),public.finish_email_digest(uuid,uuid,boolean),public.finish_inactivity_notice(uuid,uuid,boolean) to service_role;
select cron.schedule('rent-to-a-friend-emails','*/10 * * * *','select private.dispatch_emails();');
select cron.schedule('rent-to-a-friend-inactive-accounts','20 3 * * *','select private.review_inactive_accounts();');
commit;
