-- Set in comune: run once in a NEW Supabase project (Postgres).
-- This migration has not been applied to a remote database by the authoring agent.
begin;
-- gen_random_uuid() is built in to supported Postgres versions.
create schema private;
revoke all on schema private from public,anon;
grant usage on schema private to authenticated;
create table private.action_limits (
 user_id uuid not null references auth.users(id) on delete cascade,
 action text not null, window_start timestamptz not null default now(), hits integer not null,
 primary key(user_id,action)
);
alter table private.action_limits enable row level security;
revoke all on private.action_limits from public,anon,authenticated;
create function private.is_confirmed_user() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null);
$$;
create function private.enforce_rate_limit(p_action text,p_limit integer,p_window interval) returns void
 language plpgsql security definer set search_path='' as $$
declare amount integer;
begin
 if not private.is_confirmed_user() then raise exception 'Accedi con una email confermata per continuare.';end if;
 insert into private.action_limits(user_id,action,window_start,hits) values(auth.uid(),p_action,now(),1)
 on conflict(user_id,action) do update set
 hits=case when private.action_limits.window_start<=now()-p_window then 1 else private.action_limits.hits+1 end,
 window_start=case when private.action_limits.window_start<=now()-p_window then now() else private.action_limits.window_start end
 returning hits into amount;
 if amount>p_limit then raise exception 'Troppe operazioni. Attendi qualche minuto e riprova.';end if;
end; $$;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (char_length(display_name) between 2 and 60),
 bio text not null default '' check (char_length(bio)<=600),
 avatar_url text not null default '' check (char_length(avatar_url)<=2000),
 email_verified boolean not null default false,
 zone text not null default 'Prati' check (zone in ('Prati','San Lorenzo','Pigneto','Ostiense','Monteverde','Flaminio','Trastevere','Nomentano','Tuscolano','EUR')), created_at timestamptz not null default now()
);
create table public.listings (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id),
 owner_name text not null default '', title text not null check (char_length(title) between 5 and 90),
 category text not null check (category in ('Camere','Obiettivi','Luci','Audio','Supporti','Accessori')),
 zone text not null check (zone in ('Prati','San Lorenzo','Pigneto','Ostiense','Monteverde','Flaminio','Trastevere','Nomentano','Tuscolano','EUR')),
 description text not null check (char_length(description) between 20 and 2000),
 price numeric(10,2) not null check (price between 0 and 10000),
 deposit numeric(10,2) not null default 0 check (deposit between 0 and 100000),
 accessories text not null check (char_length(accessories) between 1 and 1500),
 conditions text not null check (char_length(conditions) between 1 and 1500),
 insurance text not null default 'Nessuna copertura inclusa.' check (char_length(insurance) between 1 and 1000),
 images text[] not null default '{}' check (cardinality(images)<=4),
 blocked jsonb not null default '[]' check (jsonb_typeof(blocked)='array'),
 active boolean not null default true, created_at timestamptz not null default now()
);
create table public.bookings (
 id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.listings(id),
 owner_id uuid not null references public.profiles(id), renter_id uuid not null references public.profiles(id),
 renter_name text not null, title text not null, start_date date not null, end_date date not null,
 total numeric(12,2) not null check (total>=0), deposit numeric(10,2) not null check (deposit>=0),
 status text not null default 'requested' check (status in ('requested','accepted','collected','returned','completed','declined','cancelled')),
 note text not null default '' check (char_length(note)<=2000),
 conditions text not null, insurance text not null, accessories text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check (owner_id<>renter_id), check(end_date>=start_date and end_date-start_date<60)
);
create table public.messages (
 id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id),
 sender_id uuid not null references public.profiles(id),
 body text not null check(char_length(trim(body)) between 1 and 2000), created_at timestamptz not null default now()
);
create table public.handoffs (
 id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id),
 actor_id uuid not null references public.profiles(id), stage text not null,
 note text not null default '' check(char_length(note)<=2000), photos text[] not null default '{}' check(cardinality(photos)<=4),
 created_at timestamptz not null default now()
);
create index bookings_listing_dates on public.bookings(listing_id,start_date,end_date);
create index bookings_renter on public.bookings(renter_id,created_at desc);
create index bookings_owner on public.bookings(owner_id,created_at desc);
create index messages_booking on public.messages(booking_id,created_at);
create index handoffs_booking on public.handoffs(booking_id,created_at);
create unique index unique_pending_request on public.bookings(listing_id,renter_id,start_date,end_date) where status='requested';

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.bookings enable row level security;
alter table public.messages enable row level security;
alter table public.handoffs enable row level security;

-- Explicit grants: status, price snapshots and private records are changed only by RPCs.
revoke all on public.profiles,public.listings,public.bookings,public.messages,public.handoffs from public,anon,authenticated;
grant select on public.profiles,public.listings to anon,authenticated;
grant update(display_name,bio,zone,avatar_url) on public.profiles to authenticated;
grant insert(owner_id,title,category,zone,description,price,deposit,accessories,conditions,insurance,images) on public.listings to authenticated;
grant update(active,title,category,zone,description,price,deposit,accessories,conditions,insurance,images) on public.listings to authenticated;
grant select on public.bookings,public.messages,public.handoffs to authenticated;
grant insert(booking_id,sender_id,body) on public.messages to authenticated;

create policy profiles_read on public.profiles for select using(true);
create policy profiles_edit on public.profiles for update to authenticated using(private.is_confirmed_user() and id=auth.uid()) with check(private.is_confirmed_user() and id=auth.uid());
create policy listings_read on public.listings for select using(active or owner_id=auth.uid());
create policy listings_insert on public.listings for insert to authenticated with check(private.is_confirmed_user() and owner_id=auth.uid());
create policy listings_edit on public.listings for update to authenticated using(private.is_confirmed_user() and owner_id=auth.uid()) with check(private.is_confirmed_user() and owner_id=auth.uid());
create policy bookings_read on public.bookings for select to authenticated using(private.is_confirmed_user() and auth.uid() in (owner_id,renter_id));
create policy messages_read on public.messages for select to authenticated using(private.is_confirmed_user() and exists(select 1 from public.bookings b where b.id=booking_id and auth.uid() in (b.owner_id,b.renter_id)));
create policy messages_insert on public.messages for insert to authenticated with check(private.is_confirmed_user() and sender_id=auth.uid() and exists(select 1 from public.bookings b where b.id=booking_id and auth.uid() in (b.owner_id,b.renter_id)));
create policy handoffs_read on public.handoffs for select to authenticated using(private.is_confirmed_user() and exists(select 1 from public.bookings b where b.id=booking_id and auth.uid() in (b.owner_id,b.renter_id)));

create function private.create_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,display_name,email_verified) values(new.id,left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),'Filmmaker'),60),new.email_confirmed_at is not null);
 return new;
end; $$;
create trigger create_user_profile after insert on auth.users for each row execute function private.create_profile();

-- Confirmation is derived from Auth, never from editable user metadata.
create function private.sync_email_verified() returns trigger language plpgsql security definer set search_path='' as $$
begin update public.profiles set email_verified=new.email_confirmed_at is not null where id=new.id;return new;end; $$;
create trigger sync_auth_email after update of email_confirmed_at on auth.users for each row execute function private.sync_email_verified();
create function private.validate_avatar() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' then perform private.enforce_rate_limit('profile_edit',30,interval '1 hour');end if;
 if new.avatar_url<>'' and new.avatar_url !~ ('^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/profile-photos/'||new.id::text||'/[a-f0-9-]+\.jpg$') then raise exception 'Carica una foto profilo dal tuo account.';end if;
 return new;
end; $$;
create trigger check_avatar before insert or update of display_name,bio,zone,avatar_url on public.profiles for each row execute function private.validate_avatar();
revoke execute on function private.sync_email_verified(),private.validate_avatar() from public,anon,authenticated;

create function private.listing_owner_name() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then perform private.enforce_rate_limit('listing_create',10,interval '1 hour');
 elsif (to_jsonb(new)-'owner_name') is distinct from (to_jsonb(old)-'owner_name') then perform private.enforce_rate_limit('listing_edit',60,interval '1 hour');end if;
 select display_name into new.owner_name from public.profiles where id=new.owner_id;
 if cardinality(new.images)<1 or exists(select 1 from unnest(new.images) image where image is null or image !~ ('^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/listing-photos/'||new.owner_id::text||'/[a-f0-9-]+\.jpg$')) then
  raise exception 'Le foto devono essere caricate nel servizio della piattaforma.';
 end if;
 return new;
end; $$;
create trigger set_listing_owner before insert or update on public.listings for each row execute function private.listing_owner_name();
create function private.sync_display_name() returns trigger language plpgsql security definer set search_path='' as $$
begin update public.listings set owner_name=new.display_name where owner_id=new.id;return new;end; $$;
create trigger sync_profile_name after update of display_name on public.profiles for each row execute function private.sync_display_name();

-- Public calendar contains only dates; it does not bypass RLS on private bookings.
create table public.listing_availability (
 listing_id uuid not null references public.listings(id), start_date date not null,end_date date not null,
 primary key(listing_id,start_date,end_date)
);
alter table public.listing_availability enable row level security;
revoke all on public.listing_availability from public,anon,authenticated;
grant select on public.listing_availability to anon,authenticated;
create policy availability_read on public.listing_availability for select using(exists(select 1 from public.listings l where l.id=listing_id));
create function private.sync_availability() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op<>'INSERT' and old.status in ('accepted','collected','returned') then
 delete from public.listing_availability where listing_id=old.listing_id and start_date=old.start_date and end_date=old.end_date;
 end if;
 if tg_op<>'DELETE' and new.status in ('accepted','collected','returned') then
 insert into public.listing_availability values(new.listing_id,new.start_date,new.end_date);
 end if;
 return null;
end; $$;
create trigger sync_booking_calendar after insert or update of status or delete on public.bookings for each row execute function private.sync_availability();

create function private.request_booking(p_listing uuid,p_start date,p_end date,p_note text default '') returns public.bookings
 language plpgsql security definer set search_path='' as $$
declare l public.listings; b public.bookings; n text;
begin
 if not private.is_confirmed_user() then raise exception 'Accedi con una email confermata per continuare.';end if;
 if p_start is null or p_end is null or p_start<current_date or p_end<p_start or p_end-p_start>=60 then raise exception 'Periodo non valido (massimo 60 giorni).';end if;
 if p_note is null or char_length(p_note)>2000 then raise exception 'Nota troppo lunga.';end if;
 perform private.enforce_rate_limit('booking_request',20,interval '1 hour');
 -- Serialize by listing: concurrent acceptance cannot create an overlap.
 select * into l from public.listings where id=p_listing for update;
 if not found or not l.active then raise exception 'Annuncio non disponibile.';end if;
 if l.owner_id=auth.uid() then raise exception 'Non puoi prenotare la tua attrezzatura.';end if;
 if exists(select 1 from jsonb_array_elements(l.blocked) x where (x->>'start_date')::date<=p_end and (x->>'end_date')::date>=p_start)
 or exists(select 1 from public.bookings where listing_id=p_listing and status in ('accepted','collected','returned') and start_date<=p_end and end_date>=p_start) then raise exception 'Attrezzatura non disponibile in queste date.';end if;
 if (select count(*) from public.bookings where renter_id=auth.uid() and status='requested')>=20 then raise exception 'Hai già 20 richieste in attesa.';end if;
 select display_name into n from public.profiles where id=auth.uid();
 insert into public.bookings(listing_id,owner_id,renter_id,renter_name,title,start_date,end_date,total,deposit,note,conditions,insurance,accessories)
 values(l.id,l.owner_id,auth.uid(),n,l.title,p_start,p_end,l.price*(p_end-p_start+1),l.deposit,p_note,l.conditions,l.insurance,l.accessories) returning * into b;
 if char_length(trim(p_note))>0 then insert into public.messages(booking_id,sender_id,body) values(b.id,auth.uid(),p_note);end if;
 return b;
end; $$;

create function private.transition_booking(p_booking uuid,p_status text,p_note text default '',p_photos text[] default '{}') returns void
 language plpgsql security definer set search_path='' as $$
declare b public.bookings; l public.listings; listing_uuid uuid; is_owner boolean; allowed boolean:=false;
begin
 if not private.is_confirmed_user() then raise exception 'Accedi con una email confermata per continuare.';end if;
 perform private.enforce_rate_limit('booking_transition',60,interval '1 hour');
 select listing_id into listing_uuid from public.bookings where id=p_booking and auth.uid() in (owner_id,renter_id);
 if listing_uuid is null then raise exception 'Prenotazione non trovata.';end if;
 select * into l from public.listings where id=listing_uuid for update;
 select * into b from public.bookings where id=p_booking for update;
 is_owner:=b.owner_id=auth.uid();
 allowed:=case b.status
 when 'requested' then (is_owner and p_status in ('accepted','declined')) or (not is_owner and p_status='cancelled')
 when 'accepted' then (is_owner and p_status='collected') or p_status='cancelled'
 when 'collected' then not is_owner and p_status='returned'
 when 'returned' then is_owner and p_status='completed'
 else false end;
 if not coalesce(allowed,false) then raise exception 'Passaggio di stato non consentito.';end if;
 if p_note is null or char_length(p_note)>2000 or p_photos is null or cardinality(p_photos)>4 then raise exception 'Note o foto non valide.';end if;
 if exists(select 1 from unnest(p_photos) p where p is null or p not like auth.uid()::text||'/'||p_booking::text||'/%' or not exists(select 1 from storage.objects o where o.bucket_id='handoff-photos' and o.name=p)) then raise exception 'Foto non appartenenti al noleggio.';end if;
 if p_status='accepted' then
  if b.start_date<current_date then raise exception 'La richiesta è scaduta.';end if;
  if exists(select 1 from public.bookings where listing_id=b.listing_id and id<>b.id and status in ('accepted','collected','returned') and start_date<=b.end_date and end_date>=b.start_date)
  or exists(select 1 from jsonb_array_elements(l.blocked) x where (x->>'start_date')::date<=b.end_date and (x->>'end_date')::date>=b.start_date)
  then raise exception 'Queste date sono già occupate.';end if;
 end if;
 update public.bookings set status=p_status,updated_at=now() where id=b.id;
 insert into public.handoffs(booking_id,actor_id,stage,note,photos) values(b.id,auth.uid(),p_status,p_note,p_photos);
end; $$;

create function private.block_dates(p_listing uuid,p_start date,p_end date) returns void language plpgsql security definer set search_path='' as $$
declare l public.listings;
begin
 perform private.enforce_rate_limit('calendar_edit',60,interval '1 hour');
 select * into l from public.listings where id=p_listing and owner_id=auth.uid() for update;
 if not found then raise exception 'Annuncio non trovato.';end if;
 if p_start is null or p_end is null or p_start<current_date or p_end<p_start or p_end-p_start>=60 then raise exception 'Periodo non valido (massimo 60 giorni).';end if;
 if exists(select 1 from public.bookings where listing_id=p_listing and status in ('accepted','collected','returned') and start_date<=p_end and end_date>=p_start) then raise exception 'Esiste già un noleggio in queste date.';end if;
 if jsonb_array_length(l.blocked)>=100 then raise exception 'Rimuovi i blocchi precedenti prima di aggiungerne altri.';end if;
 update public.listings set blocked=blocked||jsonb_build_array(jsonb_build_object('start_date',p_start,'end_date',p_end)) where id=l.id;
end; $$;
create function private.clear_blocks(p_listing uuid) returns void language plpgsql security definer set search_path='' as $$
begin perform private.enforce_rate_limit('calendar_edit',60,interval '1 hour');update public.listings set blocked='[]' where id=p_listing and owner_id=auth.uid();if not found then raise exception 'Annuncio non trovato.';end if;end; $$;

create function private.limit_messages() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform private.enforce_rate_limit('message',5,interval '10 seconds');
 return new;
end; $$;
create trigger rate_limit_messages before insert on public.messages for each row execute function private.limit_messages();

revoke execute on function private.create_profile(),private.listing_owner_name(),private.sync_display_name(),private.limit_messages() from public,anon,authenticated;
revoke execute on function private.request_booking(uuid,date,date,text),private.transition_booking(uuid,text,text,text[]),private.block_dates(uuid,date,date),private.clear_blocks(uuid) from public,anon;
grant execute on function private.request_booking(uuid,date,date,text),private.transition_booking(uuid,text,text,text[]),private.block_dates(uuid,date,date),private.clear_blocks(uuid) to authenticated;

-- API wrappers run as the caller; privileged logic is in the non-exposed private schema.
create function public.request_booking(p_listing uuid,p_start date,p_end date,p_note text default '') returns public.bookings
 language sql security invoker set search_path='' as $$ select private.request_booking(p_listing,p_start,p_end,p_note); $$;
create function public.transition_booking(p_booking uuid,p_status text,p_note text default '',p_photos text[] default '{}') returns void
 language sql security invoker set search_path='' as $$ select private.transition_booking(p_booking,p_status,p_note,p_photos); $$;
create function public.block_dates(p_listing uuid,p_start date,p_end date) returns void
 language sql security invoker set search_path='' as $$ select private.block_dates(p_listing,p_start,p_end); $$;
create function public.clear_blocks(p_listing uuid) returns void
 language sql security invoker set search_path='' as $$ select private.clear_blocks(p_listing); $$;
revoke all on function public.request_booking(uuid,date,date,text),public.transition_booking(uuid,text,text,text[]),public.block_dates(uuid,date,date),public.clear_blocks(uuid) from public,anon,authenticated;
grant execute on function public.request_booking(uuid,date,date,text),public.transition_booking(uuid,text,text,text[]),public.block_dates(uuid,date,date),public.clear_blocks(uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('profile-photos','profile-photos',true,512000,array['image/jpeg']),
 ('listing-photos','listing-photos',true,512000,array['image/jpeg']),
 ('handoff-photos','handoff-photos',false,512000,array['image/jpeg']);
create policy public_profile_images on storage.objects for select using(bucket_id='profile-photos');
create policy upload_profile_images on storage.objects for insert to authenticated with check(private.is_confirmed_user() and bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy cleanup_unused_profile_images on storage.objects for delete to authenticated using(private.is_confirmed_user() and bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.profiles p where p.avatar_url like '%/storage/v1/object/public/profile-photos/'||name));
create policy public_listing_images on storage.objects for select using(bucket_id='listing-photos');
create policy upload_listing_images on storage.objects for insert to authenticated with check(private.is_confirmed_user() and bucket_id='listing-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy private_handoff_read on storage.objects for select to authenticated using(private.is_confirmed_user() and bucket_id='handoff-photos' and exists(select 1 from public.bookings b where b.id::text=(storage.foldername(name))[2] and auth.uid() in (b.owner_id,b.renter_id)));
create policy private_handoff_upload on storage.objects for insert to authenticated with check(private.is_confirmed_user() and bucket_id='handoff-photos' and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from public.bookings b where b.id::text=(storage.foldername(name))[2] and auth.uid() in (b.owner_id,b.renter_id)));
create policy cleanup_unused_listing_images on storage.objects for delete to authenticated
 using(private.is_confirmed_user() and bucket_id='listing-photos' and (storage.foldername(name))[1]=auth.uid()::text
 and not exists(select 1 from public.listings l where exists(select 1 from unnest(l.images) image where image like '%/storage/v1/object/public/listing-photos/'||name)));
create policy cleanup_unused_handoff_images on storage.objects for delete to authenticated
 using(private.is_confirmed_user() and bucket_id='handoff-photos' and (storage.foldername(name))[1]=auth.uid()::text
 and not exists(select 1 from public.handoffs h where name=any(h.photos)));
create function private.limit_uploads() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.bucket_id not in ('listing-photos','profile-photos','handoff-photos') then return new;end if;
 perform private.enforce_rate_limit('photo_upload',30,interval '1 hour');
 -- Serialize quota checks so concurrent uploads cannot bypass the cap.
 perform pg_advisory_xact_lock(71842026);
 if (select count(*) from storage.objects where bucket_id in ('listing-photos','profile-photos','handoff-photos'))>=1500 then raise exception 'Il pilota ha raggiunto il limite di foto. Contatta il gestore.';end if;
 if (select count(*) from storage.objects where bucket_id in ('listing-photos','profile-photos','handoff-photos') and name like auth.uid()::text||'/%')>=200 then raise exception 'Hai raggiunto il limite di foto del pilota. Contatta il gestore.';end if;
 return new;
end; $$;
create trigger limit_app_photo_uploads before insert on storage.objects for each row execute function private.limit_uploads();
revoke all on all functions in schema private from public,anon,authenticated;
grant execute on function private.is_confirmed_user(),private.request_booking(uuid,date,date,text),private.transition_booking(uuid,text,text,text[]),private.block_dates(uuid,date,date),private.clear_blocks(uuid) to authenticated;
commit;
