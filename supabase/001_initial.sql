-- Set in comune: run once in a NEW Supabase project (Postgres).
-- This migration has not been applied to a remote database by the authoring agent.
begin;
create extension if not exists pgcrypto;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (char_length(display_name) between 2 and 60),
 bio text not null default '' check (char_length(bio)<=600),
 zone text not null default 'Prati', created_at timestamptz not null default now()
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
revoke all on public.profiles,public.listings,public.bookings,public.messages,public.handoffs from anon,authenticated;
grant select on public.profiles,public.listings to anon,authenticated;
grant update(display_name,bio,zone) on public.profiles to authenticated;
grant insert(owner_id,title,category,zone,description,price,deposit,accessories,conditions,insurance,images) on public.listings to authenticated;
grant update(active) on public.listings to authenticated;
grant select on public.bookings,public.messages,public.handoffs to authenticated;
grant insert(booking_id,sender_id,body) on public.messages to authenticated;

create policy profiles_read on public.profiles for select using(true);
create policy profiles_edit on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy listings_read on public.listings for select using(active or owner_id=auth.uid());
create policy listings_insert on public.listings for insert to authenticated with check(owner_id=auth.uid());
create policy listings_edit on public.listings for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy bookings_read on public.bookings for select to authenticated using(auth.uid() in (owner_id,renter_id));
create policy messages_read on public.messages for select to authenticated using(exists(select 1 from public.bookings b where b.id=booking_id and auth.uid() in (b.owner_id,b.renter_id)));
create policy messages_insert on public.messages for insert to authenticated with check(sender_id=auth.uid() and exists(select 1 from public.bookings b where b.id=booking_id and auth.uid() in (b.owner_id,b.renter_id)));
create policy handoffs_read on public.handoffs for select to authenticated using(exists(select 1 from public.bookings b where b.id=booking_id and auth.uid() in (b.owner_id,b.renter_id)));

create function public.create_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,display_name) values(new.id,left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),'Filmmaker'),60));
 return new;
end; $$;
create trigger create_user_profile after insert on auth.users for each row execute function public.create_profile();

create function public.listing_owner_name() returns trigger language plpgsql security definer set search_path='' as $$
begin
 select display_name into new.owner_name from public.profiles where id=new.owner_id;
 if exists(select 1 from unnest(new.images) image where image !~ '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/listing-photos/') then
  raise exception 'Le foto devono essere caricate nel servizio della piattaforma.';
 end if;
 return new;
end; $$;
create trigger set_listing_owner before insert on public.listings for each row execute function public.listing_owner_name();
create function public.sync_display_name() returns trigger language plpgsql security definer set search_path='' as $$
begin update public.listings set owner_name=new.display_name where owner_id=new.id;return new;end; $$;
create trigger sync_profile_name after update of display_name on public.profiles for each row execute function public.sync_display_name();

-- Only dates and listing IDs are public. No renter identity, price, address, or notes.
create view public.listing_availability as
 select listing_id,start_date,end_date from public.bookings where status in ('accepted','collected','returned');
revoke all on public.listing_availability from anon,authenticated;
grant select on public.listing_availability to anon,authenticated;

create function public.request_booking(p_listing uuid,p_start date,p_end date,p_note text default '') returns public.bookings
 language plpgsql security definer set search_path='' as $$
declare l public.listings; b public.bookings; n text;
begin
 if auth.uid() is null then raise exception 'Accedi per continuare.';end if;
 if p_start is null or p_end is null or p_start<current_date or p_end<p_start or p_end-p_start>=60 then raise exception 'Periodo non valido (massimo 60 giorni).';end if;
 if p_note is null or char_length(p_note)>2000 then raise exception 'Nota troppo lunga.';end if;
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

create function public.transition_booking(p_booking uuid,p_status text,p_note text default '',p_photos text[] default '{}') returns void
 language plpgsql security definer set search_path='' as $$
declare b public.bookings; l public.listings; listing_uuid uuid; is_owner boolean; allowed boolean:=false;
begin
 if auth.uid() is null then raise exception 'Accedi per continuare.';end if;
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
 if exists(select 1 from unnest(p_photos) p where p not like auth.uid()::text||'/'||p_booking::text||'/%') then raise exception 'Foto non appartenenti al noleggio.';end if;
 if p_status='accepted' then
  if b.start_date<current_date then raise exception 'La richiesta è scaduta.';end if;
  if exists(select 1 from public.bookings where listing_id=b.listing_id and id<>b.id and status in ('accepted','collected','returned') and start_date<=b.end_date and end_date>=b.start_date)
  or exists(select 1 from jsonb_array_elements(l.blocked) x where (x->>'start_date')::date<=b.end_date and (x->>'end_date')::date>=b.start_date)
  then raise exception 'Queste date sono già occupate.';end if;
 end if;
 update public.bookings set status=p_status,updated_at=now() where id=b.id;
 insert into public.handoffs(booking_id,actor_id,stage,note,photos) values(b.id,auth.uid(),p_status,p_note,p_photos);
end; $$;

create function public.block_dates(p_listing uuid,p_start date,p_end date) returns void language plpgsql security definer set search_path='' as $$
declare l public.listings;
begin
 select * into l from public.listings where id=p_listing and owner_id=auth.uid() for update;
 if not found then raise exception 'Annuncio non trovato.';end if;
 if p_start is null or p_end is null or p_start<current_date or p_end<p_start or p_end-p_start>=60 then raise exception 'Periodo non valido (massimo 60 giorni).';end if;
 if exists(select 1 from public.bookings where listing_id=p_listing and status in ('accepted','collected','returned') and start_date<=p_end and end_date>=p_start) then raise exception 'Esiste già un noleggio in queste date.';end if;
 if jsonb_array_length(l.blocked)>=100 then raise exception 'Rimuovi i blocchi precedenti prima di aggiungerne altri.';end if;
 update public.listings set blocked=blocked||jsonb_build_array(jsonb_build_object('start_date',p_start,'end_date',p_end)) where id=l.id;
end; $$;
create function public.clear_blocks(p_listing uuid) returns void language plpgsql security definer set search_path='' as $$
begin update public.listings set blocked='[]' where id=p_listing and owner_id=auth.uid();end; $$;

create function public.limit_messages() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.sender_id::text,0));
 if (select count(*) from public.messages where sender_id=new.sender_id and created_at>now()-interval '10 seconds')>=5 then raise exception 'Troppi messaggi. Attendi qualche secondo.';end if;
 return new;
end; $$;
create trigger rate_limit_messages before insert on public.messages for each row execute function public.limit_messages();

revoke execute on function public.create_profile(),public.listing_owner_name(),public.sync_display_name(),public.limit_messages() from public,anon,authenticated;
revoke execute on function public.request_booking(uuid,date,date,text),public.transition_booking(uuid,text,text,text[]),public.block_dates(uuid,date,date),public.clear_blocks(uuid) from public,anon;
grant execute on function public.request_booking(uuid,date,date,text),public.transition_booking(uuid,text,text,text[]),public.block_dates(uuid,date,date),public.clear_blocks(uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('listing-photos','listing-photos',true,5242880,array['image/jpeg','image/png','image/webp']),
 ('handoff-photos','handoff-photos',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy public_listing_images on storage.objects for select using(bucket_id='listing-photos');
create policy upload_listing_images on storage.objects for insert to authenticated with check(bucket_id='listing-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy private_handoff_read on storage.objects for select to authenticated using(bucket_id='handoff-photos' and exists(select 1 from public.bookings b where b.id::text=(storage.foldername(name))[2] and auth.uid() in (b.owner_id,b.renter_id)));
create policy private_handoff_upload on storage.objects for insert to authenticated with check(bucket_id='handoff-photos' and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from public.bookings b where b.id::text=(storage.foldername(name))[2] and auth.uid() in (b.owner_id,b.renter_id)));
commit;
