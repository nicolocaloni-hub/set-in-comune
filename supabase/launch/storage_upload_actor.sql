-- Fix only the app's quota trigger. Storage performs its final metadata write
-- as supabase_storage_admin without the end-user JWT after its RLS preflight.
begin;
do $$begin
 if (select md5(prosrc) from pg_proc where oid='private.limit_uploads()'::regprocedure)<>'c7d0646f3c419d05f4841404317d9961' then
  raise exception 'Upload quota function changed since review; inspect before applying';
 end if;
end$$;
create or replace function private.limit_uploads() returns trigger
language plpgsql security definer set search_path='' as $$
declare actor uuid;amount integer;
begin
 if new.bucket_id not in ('listing-photos','profile-photos','handoff-photos') then return new;end if;
 actor:=auth.uid();
 -- session_user is the connection identity, not the SECURITY DEFINER owner or
 -- a claim supplied by a caller. Ordinary clients cannot select this branch.
 if actor is null and session_user='supabase_storage_admin' then
  if new.owner_id is null or new.owner_id !~ '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$' then
   raise exception 'Proprietario del caricamento non valido.';
  end if;
  actor:=new.owner_id::uuid;
 end if;
 if actor is null or not exists(select 1 from auth.users u where u.id=actor and u.email_confirmed_at is not null) or not private.account_open(actor) then
  raise exception 'Accedi con una email confermata per continuare.';
 end if;
 if split_part(new.name,'/',1)<>actor::text or (new.owner_id is not null and new.owner_id<>actor::text) then
  raise exception 'Foto non appartenente al tuo account.';
 end if;
 -- Fixed action and limit; do not expose a parameterized quota bypass.
 insert into private.action_limits(user_id,action,window_start,hits) values(actor,'photo_upload',now(),1)
 on conflict(user_id,action) do update set
 hits=case when private.action_limits.window_start<=now()-interval '1 hour' then 1 else private.action_limits.hits+1 end,
 window_start=case when private.action_limits.window_start<=now()-interval '1 hour' then now() else private.action_limits.window_start end
 returning hits into amount;
 if amount>30 then raise exception 'Troppe operazioni. Attendi qualche minuto e riprova.';end if;
 perform pg_advisory_xact_lock(71842026);
 if (select count(*) from storage.objects where bucket_id in ('listing-photos','profile-photos','handoff-photos'))>=1500 then raise exception 'Il pilota ha raggiunto il limite di foto. Contatta il gestore.';end if;
 if (select count(*) from storage.objects where bucket_id in ('listing-photos','profile-photos','handoff-photos') and name like actor::text||'/%')>=200 then raise exception 'Hai raggiunto il limite di foto del pilota. Contatta il gestore.';end if;
 return new;
end; $$;
revoke all on function private.limit_uploads() from public,anon,authenticated;
commit;
