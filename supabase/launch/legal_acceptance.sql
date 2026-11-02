-- Applied to srjdysdhxnafjrutufmk as migration 20261102000639 on 2026-11-02.
-- Do not replay on the same database. The migration publishes no legal document.
-- No document is published and no receipt is fabricated by this script.
-- Applied through the authenticated Supabase migration connector, with no CLI install.
-- See applied-migrations.json for the source digest at application.
begin;
create table private.legal_releases (
 version text primary key check(char_length(version) between 1 and 80),
 terms_text text not null check(char_length(terms_text) between 20 and 150000),
 privacy_text text not null check(char_length(privacy_text) between 20 and 150000),
 terms_hash text not null check(terms_hash ~ '^[a-f0-9]{64}$'),
 privacy_hash text not null check(privacy_hash ~ '^[a-f0-9]{64}$'),
 published_at timestamptz,
 active boolean not null default false,
 check(not active or published_at is not null)
);
create unique index one_active_legal_release on private.legal_releases(active) where active;
create table private.legal_receipts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 version text not null references private.legal_releases(version),
 accepted_at timestamptz not null default clock_timestamp(),
 terms_accepted boolean not null check(terms_accepted),
 privacy_seen boolean not null check(privacy_seen),
 private_adult boolean not null check(private_adult),
 unique(user_id,version)
);
create index legal_receipts_version on private.legal_receipts(version);
alter table private.legal_releases enable row level security;
alter table private.legal_receipts enable row level security;
revoke all on private.legal_releases,private.legal_receipts from public,anon,authenticated;
-- convert_to is STABLE in PostgreSQL, so compute hashes in a trigger rather
-- than incorrectly marking it IMMUTABLE for a generated column.
create function private.hash_legal_release() returns trigger language plpgsql set search_path='' as $$begin
 new.terms_hash=encode(sha256(convert_to(new.terms_text,'UTF8')),'hex');
 new.privacy_hash=encode(sha256(convert_to(new.privacy_text,'UTF8')),'hex');
 return new;
end;$$;
create trigger hash_legal_release before insert or update on private.legal_releases for each row execute function private.hash_legal_release();
create function private.protect_legal_release() returns trigger language plpgsql set search_path='' as $$begin
 if old.published_at is not null then
  if tg_op='DELETE' then raise exception 'Una versione pubblicata resta archiviata.';end if;
  if new.version is distinct from old.version or new.terms_text is distinct from old.terms_text or new.privacy_text is distinct from old.privacy_text or new.published_at is distinct from old.published_at then
   raise exception 'Pubblica una nuova versione: i documenti pubblicati sono immutabili.';
  end if;
 end if;
 if tg_op='DELETE' then return old;end if;
 return new;
end;$$;
create trigger protect_legal_release before update or delete on private.legal_releases for each row execute function private.protect_legal_release();
create function private.has_current_legal_acceptance() returns boolean language sql stable security definer set search_path='' as $$
 select private.is_confirmed_user() and exists(select 1 from private.legal_receipts r join private.legal_releases d using(version) where r.user_id=auth.uid() and d.active);
$$;
create function private.my_legal_status() returns jsonb language plpgsql security definer set search_path='' as $$declare doc private.legal_releases;receipt private.legal_receipts;begin
 if not private.is_confirmed_user() then raise exception 'Accedi con una email confermata per continuare.';end if;
 select * into doc from private.legal_releases where active;
 if not found then return jsonb_build_object('available',false,'accepted',false);end if;
 select * into receipt from private.legal_receipts where user_id=auth.uid() and version=doc.version;
 return jsonb_build_object('available',true,'accepted',receipt.id is not null,'version',doc.version,'terms_hash',doc.terms_hash,'privacy_hash',doc.privacy_hash,'terms_text',doc.terms_text,'privacy_text',doc.privacy_text,'receipt_id',receipt.id,'accepted_at',receipt.accepted_at);
end;$$;
create function private.accept_legal_documents(p_version text,p_terms_hash text,p_privacy_hash text,p_terms_accepted boolean,p_privacy_seen boolean,p_private_adult boolean) returns jsonb language plpgsql security definer set search_path='' as $$declare doc private.legal_releases;begin
 if not private.is_confirmed_user() then raise exception 'Accedi con una email confermata per continuare.';end if;
 if p_terms_accepted is distinct from true or p_privacy_seen is distinct from true or p_private_adult is distinct from true then raise exception 'Servono accettazione delle condizioni, presa visione della privacy e dichiarazione di privato maggiorenne.';end if;
 -- The lock prevents switching away from this version during the acceptance.
 select * into doc from private.legal_releases where active for share;
 if not found then raise exception 'I documenti del servizio non sono ancora pubblicati.';end if;
 if p_version is distinct from doc.version or p_terms_hash is distinct from doc.terms_hash or p_privacy_hash is distinct from doc.privacy_hash then raise exception 'I documenti sono cambiati. Riaprili prima di accettare.';end if;
 insert into private.legal_receipts(user_id,version,terms_accepted,privacy_seen,private_adult) values(auth.uid(),doc.version,true,true,true) on conflict(user_id,version) do nothing;
 return private.my_legal_status();
end;$$;
create function private.my_legal_receipts() returns jsonb language plpgsql security definer set search_path='' as $$begin
 if not private.is_confirmed_user() then raise exception 'Accedi con una email confermata per continuare.';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'version',r.version,'accepted_at',r.accepted_at,'terms_hash',d.terms_hash,'privacy_hash',d.privacy_hash,'terms_accepted',r.terms_accepted,'privacy_seen',r.privacy_seen,'private_adult',r.private_adult,'terms_text',d.terms_text,'privacy_text',d.privacy_text) order by r.accepted_at desc) from private.legal_receipts r join private.legal_releases d using(version) where r.user_id=auth.uid()),'[]'::jsonb);
end;$$;
-- Public functions are invoker wrappers; privileged code remains in private.
create function public.my_legal_status() returns jsonb language sql security invoker set search_path='' as $$select private.my_legal_status();$$;
create function public.accept_legal_documents(p_version text,p_terms_hash text,p_privacy_hash text,p_terms_accepted boolean,p_privacy_seen boolean,p_private_adult boolean) returns jsonb language sql security invoker set search_path='' as $$select private.accept_legal_documents(p_version,p_terms_hash,p_privacy_hash,p_terms_accepted,p_privacy_seen,p_private_adult);$$;
create function public.my_legal_receipts() returns jsonb language sql security invoker set search_path='' as $$select private.my_legal_receipts();$$;
revoke all on function private.hash_legal_release(),private.protect_legal_release(),private.has_current_legal_acceptance(),private.my_legal_status(),private.accept_legal_documents(text,text,text,boolean,boolean,boolean),private.my_legal_receipts(),public.my_legal_status(),public.accept_legal_documents(text,text,text,boolean,boolean,boolean),public.my_legal_receipts() from public,anon,authenticated;
grant execute on function private.has_current_legal_acceptance(),private.my_legal_status(),private.accept_legal_documents(text,text,text,boolean,boolean,boolean),private.my_legal_receipts(),public.my_legal_status(),public.accept_legal_documents(text,text,text,boolean,boolean,boolean),public.my_legal_receipts() to authenticated;
-- Gate NEW marketplace activity server-side, including direct REST/RPC clients.
-- Reading/export, erasure, refunds agreed outside the app, pausing listings and
-- terminating existing rentals remain possible without accepting a new version.
create function private.guard_new_activity_terms() returns trigger language plpgsql security definer set search_path='' as $$begin
 if tg_table_schema='public' and tg_table_name='messages' then
  if exists(select 1 from public.bookings b where b.id=new.booking_id and auth.uid() in(b.owner_id,b.renter_id) and b.status in('accepted','collected','returned')) then return new;end if;
 end if;
 if auth.uid() is not null and not private.has_current_legal_acceptance() then raise exception 'Prima di creare nuove attività leggi e accetta le condizioni aggiornate da I tuoi dati.';end if;
 return new;
end;$$;
revoke all on function private.guard_new_activity_terms() from public,anon,authenticated;
create trigger legal_new_listing before insert on public.listings for each row execute function private.guard_new_activity_terms();
create trigger legal_edit_active_listing before update on public.listings for each row when (new.active) execute function private.guard_new_activity_terms();
create trigger legal_accept_booking before update on public.bookings for each row when (new.status='accepted' and old.status is distinct from new.status) execute function private.guard_new_activity_terms();
create trigger legal_new_booking before insert on public.bookings for each row execute function private.guard_new_activity_terms();
create trigger legal_new_message before insert on public.messages for each row execute function private.guard_new_activity_terms();
create trigger legal_new_inquiry before insert on public.inquiries for each row execute function private.guard_new_activity_terms();
create trigger legal_new_inquiry_message before insert on public.inquiry_messages for each row execute function private.guard_new_activity_terms();
create trigger legal_new_review before insert on public.rental_reviews for each row execute function private.guard_new_activity_terms();
-- Storage insertion is gated for NEW profile/listing photos. Existing rental
-- evidence remains uploadable so a version change cannot block a return.
create trigger legal_new_photo before insert on storage.objects for each row when (new.bucket_id in('profile-photos','listing-photos')) execute function private.guard_new_activity_terms();
-- Keep rectification available without exposing the parameterized quota helper.
-- The original avatar validator ran as invoker but called a revoked helper.
-- Validation stays invoker; a separate, fixed-action trigger owns quota writes.
create or replace function private.validate_avatar() returns trigger language plpgsql security invoker set search_path='' as $$begin
 if new.avatar_url<>'' and new.avatar_url !~ ('^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/profile-photos/'||new.id::text||'/[a-f0-9-]+\.jpg$') then raise exception 'Carica una foto profilo dal tuo account.';end if;
 return new;
end;$$;
create function private.limit_own_profile_edit() returns trigger language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is not null then
  if auth.uid() is distinct from new.id then raise exception 'Non autorizzato.';end if;
  perform private.enforce_rate_limit('profile_edit',30,interval '1 hour');
 end if;
 return new;
end;$$;
revoke all on function private.validate_avatar(),private.limit_own_profile_edit() from public,anon,authenticated;
create trigger fixed_profile_edit_quota before update of display_name,bio,zone,avatar_url on public.profiles for each row execute function private.limit_own_profile_edit();
commit;
