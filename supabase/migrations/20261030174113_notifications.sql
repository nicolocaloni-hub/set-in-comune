begin;
grant usage on schema private to service_role;
create table public.notifications (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,
 booking_id uuid not null references public.bookings(id),kind text not null check(kind in ('message','request')),
 message_id uuid references public.messages(id),created_at timestamptz not null default now(),read_at timestamptz
);
create unique index notification_message_unique on public.notifications(message_id) where message_id is not null;
create unique index notification_request_unique on public.notifications(booking_id,user_id) where kind='request';
create index notification_unread on public.notifications(user_id,booking_id,created_at) where read_at is null;
alter table public.notifications enable row level security;
revoke all on public.notifications from public,anon,authenticated;
grant select on public.notifications to authenticated;
create policy notification_owner_read on public.notifications for select to authenticated using(private.is_confirmed_user() and user_id=(select auth.uid()));

create table private.push_settings (
 id boolean primary key default true check(id),vapid_public_key text not null,
 private_key_secret uuid not null,hook_secret uuid not null,
 subject text not null,app_origin text not null check(app_origin ~ '^https://[^/[:space:]]+$'),worker_url text not null check(worker_url ~ '^https://[a-z0-9-]+\.supabase\.co/functions/v1/push-dispatch$'),enabled boolean not null default false
);
create table private.push_subscriptions (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,
 endpoint text not null unique,p256dh text not null,auth_key text not null,
 messages boolean not null default true,requests boolean not null default true,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index push_subscriptions_user on private.push_subscriptions(user_id);
create table private.push_jobs (
 id uuid primary key default gen_random_uuid(),notification_id uuid not null references public.notifications(id) on delete cascade,
 subscription_id uuid not null references private.push_subscriptions(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','sending','sent','failed')),
 attempts integer not null default 0,next_attempt timestamptz not null default now(),lease_until timestamptz,lease_token uuid,
 last_http_status integer,created_at timestamptz not null default now(),unique(notification_id,subscription_id)
);
create index push_jobs_pending on private.push_jobs(next_attempt) where status in ('pending','sending');
alter table private.push_settings enable row level security;
alter table private.push_subscriptions enable row level security;
alter table private.push_jobs enable row level security;
revoke all on private.push_settings,private.push_subscriptions,private.push_jobs from public,anon,authenticated;

create function private.notification_counts() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.is_confirmed_user() then raise exception 'Accedi per continuare.';end if;
 select jsonb_build_object('messages',count(*) filter(where kind='message'),'requests',count(*) filter(where kind='request'),
 'byBooking',coalesce((select jsonb_object_agg(booking_id,n) from(select booking_id,count(*) n from public.notifications where user_id=auth.uid() and read_at is null and kind='message' group by booking_id) x),'{}'::jsonb))
 into result from public.notifications where user_id=auth.uid() and read_at is null;
 return result;
end; $$;
create function private.read_notifications(p_booking uuid,p_kind text,p_through timestamptz) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.is_confirmed_user() then raise exception 'Accedi per continuare.';end if;
 if p_kind not in ('message','request') or p_kind is null or p_through is null then raise exception 'Lettura non valida.';end if;
 update public.notifications set read_at=now() where user_id=auth.uid() and booking_id=p_booking and kind=p_kind and read_at is null and created_at<=least(p_through,now());
 update private.push_jobs j set status='failed' from public.notifications n where j.notification_id=n.id and n.user_id=auth.uid() and n.read_at is not null and j.status='pending';
end; $$;
create function private.get_push_config() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not private.is_confirmed_user() then raise exception 'Accedi per continuare.';end if;
 return coalesce((select jsonb_build_object('publicKey',vapid_public_key) from private.push_settings where enabled),'{}'::jsonb);
end; $$;
create function private.save_push_subscription(p_endpoint text,p_p256dh text,p_auth text,p_messages boolean,p_requests boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.enforce_rate_limit('push_subscription',60,interval '1 hour');
 if p_endpoint is null or char_length(p_endpoint)>2048 or p_endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/[^[:space:]#]+$'
 or p_p256dh is null or p_p256dh !~ '^[A-Za-z0-9_-]{87}$' or p_auth is null or p_auth !~ '^[A-Za-z0-9_-]{22}$' or p_messages is null or p_requests is null then raise exception 'Sottoscrizione non valida.';end if;
 if not exists(select 1 from private.push_settings where enabled) then raise exception 'Notifiche non ancora disponibili.';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,712));
 if not exists(select 1 from private.push_subscriptions where endpoint=p_endpoint) and (select count(*) from private.push_subscriptions where user_id=auth.uid())>=10 then raise exception 'Hai già attivato dieci dispositivi. Contatta il gestore.';end if;
 insert into private.push_subscriptions(user_id,endpoint,p256dh,auth_key,messages,requests)
 values(auth.uid(),p_endpoint,p_p256dh,p_auth,p_messages,p_requests)
 on conflict(endpoint) do update set user_id=auth.uid(),p256dh=excluded.p256dh,auth_key=excluded.auth_key,messages=excluded.messages,requests=excluded.requests,updated_at=now()
 where private.push_subscriptions.user_id=auth.uid() or (private.push_subscriptions.p256dh=excluded.p256dh and private.push_subscriptions.auth_key=excluded.auth_key);
 if not found then raise exception 'Sottoscrizione non valida.';end if;
end; $$;
create function private.push_status(p_endpoint text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not private.is_confirmed_user() then raise exception 'Accedi per continuare.';end if;
 return coalesce((select jsonb_build_object('enabled',messages or requests,'messages',messages,'requests',requests) from private.push_subscriptions where user_id=auth.uid() and endpoint=p_endpoint),'{"enabled":false}'::jsonb);
end; $$;
create function private.remove_push_subscription(p_endpoint text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.is_confirmed_user() then raise exception 'Accedi per continuare.';end if;
 delete from private.push_subscriptions where user_id=auth.uid() and endpoint=p_endpoint;
end; $$;

-- Only a server with the intrinsic service-role credential can access Vault and the outbox.
create function private.push_worker_config() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Forbidden';end if;
 return (select jsonb_build_object('publicKey',s.vapid_public_key,'privateKey',p.decrypted_secret,'hookSecret',h.decrypted_secret,'subject',s.subject,'appOrigin',s.app_origin,'enabled',s.enabled)
 from private.push_settings s join vault.decrypted_secrets p on p.id=s.private_key_secret join vault.decrypted_secrets h on h.id=s.hook_secret where s.id);
end; $$;
create function private.claim_push_jobs() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Forbidden';end if;
 if not exists(select 1 from private.push_settings where enabled) then return '[]'::jsonb;end if;
 with picked as(
 select j.id from private.push_jobs j join public.notifications n on n.id=j.notification_id
 join private.push_subscriptions s on s.id=j.subscription_id
 where n.read_at is null and j.created_at>now()-interval '24 hours' and j.attempts<6 and j.next_attempt<=now()
 and (j.status='pending' or(j.status='sending' and j.lease_until<now()))
 and ((n.kind='message' and s.messages) or(n.kind='request' and s.requests))
 order by j.created_at for update of j skip locked limit 20
 ),claimed as(update private.push_jobs j set status='sending',attempts=attempts+1,lease_until=now()+interval '2 minutes',lease_token=gen_random_uuid() from picked where j.id=picked.id returning j.*)
 select coalesce(jsonb_agg(jsonb_build_object('jobId',j.id,'leaseToken',j.lease_token,'notificationId',n.id,'userId',n.user_id,'kind',n.kind,'bookingId',n.booking_id,
 'endpoint',s.endpoint,'p256dh',s.p256dh,'auth',s.auth_key,'unreadTotal',(select count(*) from public.notifications x where x.user_id=n.user_id and x.read_at is null))),'[]'::jsonb)
 into result from claimed j join public.notifications n on n.id=j.notification_id join private.push_subscriptions s on s.id=j.subscription_id;
 return result;
end; $$;
create function private.finish_push_job(p_job uuid,p_lease uuid,p_status integer) returns void language plpgsql security definer set search_path='' as $$
declare j private.push_jobs;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Forbidden';end if;
 select * into j from private.push_jobs where id=p_job and lease_token=p_lease and status='sending' for update;
 if not found then return;end if;
 if p_status in (404,410) then delete from private.push_subscriptions where id=j.subscription_id;return;end if;
 update private.push_jobs set
 status=case when p_status between 200 and 299 then 'sent' when attempts>=6 or p_status in(400,401,403) then 'failed' else 'pending' end,
 last_http_status=p_status,next_attempt=now()+make_interval(secs=>least(1800,30*power(2,attempts)::integer)),lease_until=null
 where id=p_job and lease_token=p_lease;
end; $$;

create function private.wake_push_worker() returns void language plpgsql security definer set search_path='' as $$
declare target text;secret text;
begin
 select s.worker_url,h.decrypted_secret into target,secret from private.push_settings s join vault.decrypted_secrets h on h.id=s.hook_secret where s.enabled;
 if target is null or secret is null then return;end if;
 -- Credentials and endpoint are configured by the operator, never from message contents.
 perform net.http_post(url:=target,body:='{}'::jsonb,headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),timeout_milliseconds:=5000);
exception when others then null; -- Durable jobs remain available for the scheduled retry.
end; $$;
create function private.enqueue_push() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into private.push_jobs(notification_id,subscription_id)
 select new.id,s.id from private.push_subscriptions s where s.user_id=new.user_id and ((new.kind='message' and s.messages) or(new.kind='request' and s.requests));
 if found then perform private.wake_push_worker();end if;
 return new;
end; $$;
create trigger enqueue_notification_push after insert on public.notifications for each row execute function private.enqueue_push();
create function private.notify_new_booking() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.notifications(user_id,booking_id,kind) values(new.owner_id,new.id,'request');return new;end; $$;
create trigger notify_booking_request after insert on public.bookings for each row execute function private.notify_new_booking();
create function private.notify_new_message() returns trigger language plpgsql security definer set search_path='' as $$
declare b public.bookings;recipient uuid;
begin
 select * into b from public.bookings where id=new.booking_id;
 -- The note included in the initial rental request is already covered by its request notification.
 if new.sender_id=b.renter_id and new.body=b.note and new.created_at=b.created_at and (select count(*) from public.messages where booking_id=b.id)=1 then return new;end if;
 recipient:=case when new.sender_id=b.owner_id then b.renter_id else b.owner_id end;
 insert into public.notifications(user_id,booking_id,kind,message_id) values(recipient,new.booking_id,'message',new.id);
 return new;
end; $$;
create trigger notify_chat_message after insert on public.messages for each row execute function private.notify_new_message();
create function private.dispatch_due_push() returns void language plpgsql security definer set search_path='' as $$
begin
 update private.push_jobs set status='failed' where status in ('pending','sending') and created_at<now()-interval '24 hours';
 update private.push_jobs set status='failed' where status='sending' and lease_until<now() and attempts>=6;
 if exists(select 1 from private.push_jobs j join public.notifications n on n.id=j.notification_id where n.read_at is null and j.attempts<6 and j.next_attempt<=now() and (j.status='pending' or(j.status='sending' and j.lease_until<now()))) then perform private.wake_push_worker();end if;
end; $$;

-- Thin invoker wrappers; no privileged function in the API schema.
create function public.notification_counts() returns jsonb language sql security invoker set search_path='' as $$select private.notification_counts();$$;
create function public.read_notifications(p_booking uuid,p_kind text,p_through timestamptz) returns void language sql security invoker set search_path='' as $$select private.read_notifications(p_booking,p_kind,p_through);$$;
create function public.get_push_config() returns jsonb language sql security invoker set search_path='' as $$select private.get_push_config();$$;
create function public.save_push_subscription(p_endpoint text,p_p256dh text,p_auth text,p_messages boolean,p_requests boolean) returns void language sql security invoker set search_path='' as $$select private.save_push_subscription(p_endpoint,p_p256dh,p_auth,p_messages,p_requests);$$;
create function public.push_status(p_endpoint text) returns jsonb language sql security invoker set search_path='' as $$select private.push_status(p_endpoint);$$;
create function public.remove_push_subscription(p_endpoint text) returns void language sql security invoker set search_path='' as $$select private.remove_push_subscription(p_endpoint);$$;
create function public.push_worker_config() returns jsonb language sql security invoker set search_path='' as $$select private.push_worker_config();$$;
create function public.claim_push_jobs() returns jsonb language sql security invoker set search_path='' as $$select private.claim_push_jobs();$$;
create function public.finish_push_job(p_job uuid,p_lease uuid,p_status integer) returns void language sql security invoker set search_path='' as $$select private.finish_push_job(p_job,p_lease,p_status);$$;
revoke execute on function private.notification_counts(),private.read_notifications(uuid,text,timestamptz),private.get_push_config(),private.save_push_subscription(text,text,text,boolean,boolean),private.push_status(text),private.remove_push_subscription(text),private.push_worker_config(),private.claim_push_jobs(),private.finish_push_job(uuid,uuid,integer),private.wake_push_worker(),private.enqueue_push(),private.notify_new_booking(),private.notify_new_message(),private.dispatch_due_push() from public,anon,authenticated;
grant execute on function private.notification_counts(),private.read_notifications(uuid,text,timestamptz),private.get_push_config(),private.save_push_subscription(text,text,text,boolean,boolean),private.push_status(text),private.remove_push_subscription(text) to authenticated;
revoke all on function public.notification_counts(),public.read_notifications(uuid,text,timestamptz),public.get_push_config(),public.save_push_subscription(text,text,text,boolean,boolean),public.push_status(text),public.remove_push_subscription(text),public.push_worker_config(),public.claim_push_jobs(),public.finish_push_job(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.notification_counts(),public.read_notifications(uuid,text,timestamptz),public.get_push_config(),public.save_push_subscription(text,text,text,boolean,boolean),public.push_status(text),public.remove_push_subscription(text) to authenticated;
grant execute on function private.push_worker_config(),private.claim_push_jobs(),private.finish_push_job(uuid,uuid,integer),public.push_worker_config(),public.claim_push_jobs(),public.finish_push_job(uuid,uuid,integer) to service_role;
commit;
