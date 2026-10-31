begin;
-- Service-only durable queue. No email, password or bearer token is stored here.
create table private.account_erasure_jobs(user_id uuid primary key,status text not null default 'queued' check(status in('queued','processing','done','review')),attempts integer not null default 0,next_attempt timestamptz not null default now(),lease uuid,lease_until timestamptz,created_at timestamptz not null default now(),finished_at timestamptz);
alter table private.account_erasure_jobs enable row level security;
revoke all on private.account_erasure_jobs from public,anon,authenticated;
create function private.account_open(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$select not exists(select 1 from private.account_erasure_jobs where user_id=p_user);$$;
revoke all on function private.account_open(uuid) from public,anon,authenticated;
grant execute on function private.account_open(uuid) to authenticated,anon;
create or replace function private.is_confirmed_user() returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null) and private.account_open(auth.uid());$$;
drop policy profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using(private.account_open(id));
drop policy listings_read on public.listings;
create policy listings_read on public.listings for select using(private.account_open(owner_id) and (active or owner_id=auth.uid()));
-- Serialize new relationships against closure. A closing account cannot gain new rentals/chats/reports.
create function private.guard_closing_accounts() returns trigger language plpgsql security definer set search_path='' as $$declare a uuid;b uuid;begin
 if tg_table_name='user_reports' then a:=new.reporter_id;b:=new.reported_id;else a:=new.owner_id;b:=new.renter_id;end if;
 perform 1 from public.profiles where id in(a,b) order by id for share;
 if not private.account_open(a) or not private.account_open(b) then raise exception 'Account in cancellazione. Contatta il gestore per assistenza.';end if;
 return new;
end;$$;
revoke all on function private.guard_closing_accounts() from public,anon,authenticated;
create trigger guard_erasure_bookings before insert on public.bookings for each row execute function private.guard_closing_accounts();
create trigger guard_erasure_inquiries before insert on public.inquiries for each row execute function private.guard_closing_accounts();
create trigger guard_erasure_reports before insert on private.user_reports for each row execute function private.guard_closing_accounts();
create function private.erasure_needs_review(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$select
 exists(select 1 from public.bookings where p_user in(owner_id,renter_id)) or
 exists(select 1 from public.inquiries where p_user in(owner_id,renter_id)) or
 exists(select 1 from private.user_reports where p_user in(reporter_id,reported_id)) or
 exists(select 1 from private.app_moderators where user_id=p_user);$$;
create function private.prepare_account_erasure(p_user uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare r uuid;begin
 if p_user is null or not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null) then raise exception 'Account non disponibile.';end if;
 perform 1 from public.profiles where id=p_user for update;
 if exists(select 1 from private.account_erasure_jobs where user_id=p_user) then return jsonb_build_object('status','queued');end if;
 if private.erasure_needs_review(p_user) then
 insert into private.privacy_requests(user_id,response) values(p_user,'La richiesta richiede verifica del gestore per noleggi, conversazioni, segnalazioni o ruolo operatore. Non è un rifiuto della cancellazione.') on conflict(user_id) where status in('open','reviewing') do update set response=excluded.response returning id into r;
 return jsonb_build_object('status','review','requestId',r);
 end if;
 insert into private.account_erasure_jobs(user_id) values(p_user);
 return jsonb_build_object('status','queued');
end;$$;
create function private.claim_account_erasures() returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 with picked as(select user_id from private.account_erasure_jobs where status in('queued','processing') and next_attempt<=now() and (lease_until is null or lease_until<now()) and attempts<12 order by created_at for update skip locked limit 5), updated as(update private.account_erasure_jobs j set status='processing',attempts=attempts+1,lease=gen_random_uuid(),lease_until=now()+interval '5 minutes' from picked p where j.user_id=p.user_id returning j.user_id,j.lease)
 select coalesce(jsonb_agg(to_jsonb(u)),'[]'::jsonb) into result from updated u;return result;
end;$$;
create function private.finish_account_erasure(p_user uuid,p_lease uuid,p_done boolean) returns void language plpgsql security definer set search_path='' as $$begin
 update private.account_erasure_jobs set status=case when p_done then 'done' when attempts>=12 then 'review' else 'queued' end,lease_until=null,next_attempt=now()+interval '10 minutes',finished_at=case when p_done then now() end where user_id=p_user and lease=p_lease and status='processing';
end;$$;
-- Called only after the worker has removed physical objects through Storage API.
create function private.erase_account_records(p_user uuid,p_lease uuid) returns void language plpgsql security definer set search_path='' as $$begin
 perform 1 from private.account_erasure_jobs where user_id=p_user and lease=p_lease and status='processing' and lease_until>now() for update;
 if not found then raise exception 'Lavorazione scaduta.';end if;
 perform 1 from public.profiles where id=p_user for update;
 if private.erasure_needs_review(p_user) then raise exception 'Verifica del gestore necessaria.';end if;
 if exists(select 1 from storage.objects where bucket_id in('profile-photos','listing-photos','handoff-photos') and (storage.foldername(name))[1]=p_user::text) then raise exception 'File ancora presenti.';end if;
 delete from public.listings where owner_id=p_user;
 delete from private.privacy_requests where user_id=p_user;
 delete from public.profiles where id=p_user;
 delete from private.action_limits where user_id=p_user;
end;$$;
create function public.prepare_account_erasure(p_user uuid) returns jsonb language sql security invoker set search_path='' as $$select private.prepare_account_erasure(p_user);$$;
create function public.claim_account_erasures() returns jsonb language sql security invoker set search_path='' as $$select private.claim_account_erasures();$$;
create function public.finish_account_erasure(p_user uuid,p_lease uuid,p_done boolean) returns void language sql security invoker set search_path='' as $$select private.finish_account_erasure(p_user,p_lease,p_done);$$;
create function public.erase_account_records(p_user uuid,p_lease uuid) returns void language sql security invoker set search_path='' as $$select private.erase_account_records(p_user,p_lease);$$;
revoke all on function private.erasure_needs_review(uuid),private.prepare_account_erasure(uuid),private.claim_account_erasures(),private.finish_account_erasure(uuid,uuid,boolean),private.erase_account_records(uuid,uuid),public.prepare_account_erasure(uuid),public.claim_account_erasures(),public.finish_account_erasure(uuid,uuid,boolean),public.erase_account_records(uuid,uuid) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.erasure_needs_review(uuid),private.prepare_account_erasure(uuid),private.claim_account_erasures(),private.finish_account_erasure(uuid,uuid,boolean),private.erase_account_records(uuid,uuid),public.prepare_account_erasure(uuid),public.claim_account_erasures(),public.finish_account_erasure(uuid,uuid,boolean),public.erase_account_records(uuid,uuid) to service_role;
-- Staff can see stalled jobs without receiving secrets or a deletion capability.
create function private.account_erasure_queue() returns jsonb language plpgsql security definer set search_path='' as $$begin
 if not private.is_confirmed_user() or not exists(select 1 from private.app_moderators where user_id=auth.uid()) then raise exception 'Non autorizzato.';end if;
 return coalesce((select jsonb_agg(to_jsonb(j)) from(select user_id,status,attempts,created_at,finished_at from private.account_erasure_jobs order by created_at desc limit 200) j),'[]'::jsonb);
end;$$;
create function public.account_erasure_queue() returns jsonb language sql security invoker set search_path='' as $$select private.account_erasure_queue();$$;
revoke all on function private.account_erasure_queue(),public.account_erasure_queue() from public,anon,authenticated;
grant execute on function private.account_erasure_queue(),public.account_erasure_queue() to authenticated;
-- Retry only when there is work. Reuse the existing server-side Vault hook; never expose it to clients.
create function private.dispatch_account_erasures() returns void language plpgsql security definer set search_path='' as $$declare secret text;target text;begin
 if not exists(select 1 from private.account_erasure_jobs where status in('queued','processing') and attempts<12 and next_attempt<=now() and (lease_until is null or lease_until<now())) then return;end if;
 select regexp_replace(s.worker_url,'/push-dispatch$','/account-erasure'),h.decrypted_secret into target,secret from private.push_settings s join vault.decrypted_secrets h on h.id=s.hook_secret where s.id;
 if target is not null and secret is not null then perform net.http_post(url:=target,body:='{}'::jsonb,headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),timeout_milliseconds:=5000);end if;
exception when others then null;
end;$$;
revoke all on function private.dispatch_account_erasures() from public,anon,authenticated;
select cron.schedule('rent-to-a-friend-account-erasure','*/5 * * * *','select private.dispatch_account_erasures();');
commit;
