begin;
alter table public.listings add column archived boolean not null default false;
alter table public.listings add constraint archived_listing_is_inactive check (not archived or not active);
grant update(archived) on public.listings to authenticated;

-- RLS continues to require the confirmed owner. No DELETE grants or data removal.
-- Both booking requests and transitions lock the listing first, so archive checks serialize.
create function private.guard_listing_archive() returns trigger language plpgsql security invoker set search_path='' as $$begin
 if new.archived then
  if new.active then raise exception 'Ripristina prima l’annuncio dall’archivio.';end if;
  if exists(select 1 from public.bookings where listing_id=new.id and status in('requested','accepted','collected','returned')) then raise exception 'Gestisci prima le richieste pendenti e i noleggi in corso.';end if;
 end if;
 return new;
end;$$;
revoke all on function private.guard_listing_archive() from public,anon,authenticated;
create trigger guard_listing_archive before update of archived,active on public.listings for each row execute function private.guard_listing_archive();

create function public.set_listing_archived(p_listing uuid,p_archived boolean) returns void language plpgsql security invoker set search_path='' as $$declare changed uuid;begin
 if not private.is_confirmed_user() then raise exception 'Accedi con una email confermata per continuare.';end if;
 if p_archived is null then raise exception 'Operazione non valida.';end if;
 update public.listings set archived=p_archived,active=false where id=p_listing and owner_id=auth.uid() returning id into changed;
 if changed is null then raise exception 'Annuncio non trovato.';end if;
end;$$;
revoke all on function public.set_listing_archived(uuid,boolean) from public,anon,authenticated;
grant execute on function public.set_listing_archived(uuid,boolean) to authenticated;
commit;
