-- One-off announcement emails to registered users (owner-approved, 22 November 2026).
-- Sent by the broadcast-email edge function through Brevo. Each person gets each campaign
-- at most once; a campaign reaches everyone only after its test copy reached the managers.
begin;

create table private.broadcast_sends(
 campaign text not null check(campaign ~ '^[a-z0-9-]{3,60}$'),
 user_id uuid not null references auth.users(id) on delete cascade,
 mode text not null check(mode in('test','all')),
 email text not null,
 status text not null default 'sending' check(status in('sending','sent','failed')),
 lease uuid not null default gen_random_uuid(),
 updated_at timestamptz not null default now(),
 primary key(campaign,user_id,mode)
);
alter table private.broadcast_sends enable row level security;

-- People who replied "NO" (added by the manager); they never receive announcements.
create table private.email_optouts(
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 note text check(char_length(note)<=200)
);
alter table private.email_optouts enable row level security;

create function private.claim_broadcast(p_campaign text,p_mode text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if p_campaign is null or p_campaign !~ '^[a-z0-9-]{3,60}$' or p_mode is null or p_mode not in('test','all') then raise exception 'Parametri non validi.';end if;
 if p_mode='all' and not exists(select 1 from private.broadcast_sends where campaign=p_campaign and mode='test' and status='sent') then
  raise exception 'Invia prima la copia di prova ai gestori.';
 end if;
 with candidates as(
  select u.id,u.email from auth.users u
  where u.email_confirmed_at is not null and u.email is not null
   and u.email !~* '@rent-to-a-friend\.invalid$'
   and (u.banned_until is null or u.banned_until<now())
   and not exists(select 1 from private.email_optouts o where o.user_id=u.id)
   and not exists(select 1 from private.account_erasure_jobs j where j.user_id=u.id)
   and (p_mode='all' or exists(select 1 from private.app_moderators m where m.user_id=u.id))
   and not exists(select 1 from private.broadcast_sends b where b.campaign=p_campaign and b.user_id=u.id and b.mode=p_mode
    and (b.status='sent' or (b.status='sending' and b.updated_at>now()-interval '15 minutes')))
  order by u.created_at limit 250
 ),claimed as(
  insert into private.broadcast_sends(campaign,user_id,mode,email) select p_campaign,id,p_mode,email from candidates
  on conflict(campaign,user_id,mode) do update set status='sending',lease=gen_random_uuid(),email=excluded.email,updated_at=now()
  returning user_id,email,lease
 )
 select coalesce(jsonb_agg(jsonb_build_object('userId',user_id,'email',email,'lease',lease)),'[]'::jsonb) into result from claimed;
 return result;
end;$$;

create function private.finish_broadcast(p_campaign text,p_mode text,p_user uuid,p_lease uuid,p_ok boolean) returns void language sql security definer set search_path='' as $$
 update private.broadcast_sends set status=case when p_ok then 'sent' else 'failed' end,updated_at=now()
 where campaign=p_campaign and mode=p_mode and user_id=p_user and lease=p_lease and status='sending';
$$;

-- Called by the manager (SQL editor / Claude with approval): wakes the edge function with the hook secret.
create function private.start_broadcast(p_campaign text,p_mode text) returns bigint language plpgsql security definer set search_path='' as $$
declare secret text;target text;
begin
 if p_campaign is null or p_campaign !~ '^[a-z0-9-]{3,60}$' or p_mode is null or p_mode not in('test','all') then raise exception 'Parametri non validi.';end if;
 select regexp_replace(s.worker_url,'/push-dispatch$','/broadcast-email'),h.decrypted_secret into target,secret
 from private.push_settings s join vault.decrypted_secrets h on h.id=s.hook_secret where s.id;
 if target is null or secret is null then raise exception 'Configurazione invio non trovata.';end if;
 return net.http_post(url:=target,body:=jsonb_build_object('campaign',p_campaign,'mode',p_mode),
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),timeout_milliseconds:=60000);
end;$$;

create function public.claim_broadcast(p_campaign text,p_mode text) returns jsonb language sql security invoker set search_path='' as $$select private.claim_broadcast(p_campaign,p_mode);$$;
create function public.finish_broadcast(p_campaign text,p_mode text,p_user uuid,p_lease uuid,p_ok boolean) returns void language sql security invoker set search_path='' as $$select private.finish_broadcast(p_campaign,p_mode,p_user,p_lease,p_ok);$$;

revoke all on function private.claim_broadcast(text,text),private.finish_broadcast(text,text,uuid,uuid,boolean),private.start_broadcast(text,text),
 public.claim_broadcast(text,text),public.finish_broadcast(text,text,uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function private.claim_broadcast(text,text),private.finish_broadcast(text,text,uuid,uuid,boolean),
 public.claim_broadcast(text,text),public.finish_broadcast(text,text,uuid,uuid,boolean) to service_role;

commit;
