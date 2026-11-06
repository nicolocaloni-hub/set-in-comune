-- Kits: several listings of the same owner, for the same dates, in one request.
-- Every item stays an ordinary booking (own price, checklist, chat and review);
-- bundle_id only groups them. The request is all-or-nothing, and so are
-- accept, decline and cancel for the whole kit. Pickup and return are still
-- confirmed item by item, each with its checklist and photos.
-- Requires 20261107091000_duration_pricing (per-item totals come from its trigger).
-- Apply once, after 20261107093000_saved_searches.
begin;
alter table public.bookings add column bundle_id uuid;
create index bookings_bundle on public.bookings(bundle_id) where bundle_id is not null;

create function private.request_bundle(p_listings uuid[],p_start date,p_end date,p_note text default '') returns uuid
 language plpgsql security definer set search_path='' as $$
declare bundle uuid:=gen_random_uuid();item uuid;first_id uuid;b public.bookings;n integer;
begin
 if not private.is_confirmed_user() then raise exception 'Accedi con una email confermata per continuare.';end if;
 if p_listings is null or array_position(p_listings,null) is not null then raise exception 'Kit non valido.';end if;
 select count(distinct x) into n from unnest(p_listings) x;
 if n<>cardinality(p_listings) or n not between 2 and 8 then raise exception 'Un kit contiene da 2 a 8 attrezzi diversi.';end if;
 if (select count(*) from public.listings where id=any(p_listings))<>n
  or (select count(distinct owner_id) from public.listings where id=any(p_listings))<>1 then
  raise exception 'Il kit deve contenere attrezzi dello stesso proprietario.';
 end if;
 if p_note is null or char_length(p_note)>2000 then raise exception 'Nota troppo lunga.';end if;
 -- Same order for everyone, so concurrent kits lock listings in the same sequence.
 -- Any failing item (dates, availability, limits) aborts the whole kit.
 for item in select x from unnest(p_listings) x order by x loop
  b:=private.request_booking(item,p_start,p_end,case when first_id is null then p_note else '' end);
  update public.bookings set bundle_id=bundle,note=p_note where id=b.id;
  if first_id is null then first_id:=b.id;end if;
 end loop;
 -- One unread request per kit for the owner: the other items are already marked
 -- read before commit, so their push jobs are never claimed.
 update public.notifications set read_at=now()
  where kind='request' and read_at is null and booking_id in(select id from public.bookings where bundle_id=bundle and id<>first_id);
 return bundle;
end;$$;

create function private.transition_bundle(p_bundle uuid,p_status text,p_note text default '') returns integer
 language plpgsql security definer set search_path='' as $$
declare item uuid;done integer:=0;
begin
 if not private.is_confirmed_user() then raise exception 'Accedi con una email confermata per continuare.';end if;
 if p_status is null or p_status not in('accepted','declined','cancelled') then
  raise exception 'Ritiro e restituzione si confermano attrezzo per attrezzo.';
 end if;
 if not exists(select 1 from public.bookings where bundle_id=p_bundle and auth.uid() in(owner_id,renter_id)) then raise exception 'Kit non trovato.';end if;
 -- Every item still goes through the checked transition: permissions, dates,
 -- availability and legal acceptance are verified per item, all or nothing.
 for item in select id from public.bookings
  where bundle_id=p_bundle and auth.uid() in(owner_id,renter_id)
   and status=any(case when p_status='cancelled' then array['requested','accepted'] else array['requested'] end)
  order by listing_id loop
  perform private.transition_booking_checked(item,p_status,coalesce(p_note,''),'{}'::text[],'{}'::jsonb);
  done:=done+1;
 end loop;
 if done=0 then raise exception 'Nessun attrezzo del kit si trova in questo stato.';end if;
 return done;
end;$$;

create function public.request_bundle(p_listings uuid[],p_start date,p_end date,p_note text default '') returns uuid
 language sql security invoker set search_path='' as $$select private.request_bundle(p_listings,p_start,p_end,p_note)$$;
create function public.transition_bundle(p_bundle uuid,p_status text,p_note text default '') returns integer
 language sql security invoker set search_path='' as $$select private.transition_bundle(p_bundle,p_status,p_note)$$;
revoke all on function private.request_bundle(uuid[],date,date,text),private.transition_bundle(uuid,text,text),
 public.request_bundle(uuid[],date,date,text),public.transition_bundle(uuid,text,text) from public,anon,authenticated;
grant execute on function private.request_bundle(uuid[],date,date,text),private.transition_bundle(uuid,text,text),
 public.request_bundle(uuid[],date,date,text),public.transition_bundle(uuid,text,text) to authenticated;
commit;
