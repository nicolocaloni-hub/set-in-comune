-- Pre-launch security audit (18 November 2026).

-- Listing photos must be files the owner uploaded to this project's listing-photos
-- bucket, the same rule private.validate_avatar applies to profile photos.
-- The browser and the share page already refuse other URLs; this closes it in the DB.
-- The trigger name sorts after set_listing_owner, so owner_id is final when it runs.
create or replace function private.validate_listing_images() returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from unnest(coalesce(new.images,'{}'::text[])) i
   where i is null or i !~ ('^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/listing-photos/'||new.owner_id::text||'/[a-f0-9-]+\.jpg$')) then
  raise exception 'Carica le foto dell''annuncio dal tuo account.';
 end if;
 return new;
end;$$;
revoke all on function private.validate_listing_images() from public, anon, authenticated;
drop trigger if exists validate_listing_images on public.listings;
create trigger validate_listing_images before insert or update of images, owner_id on public.listings
 for each row execute function private.validate_listing_images();

-- The reputation view is read-only: keep SELECT, drop the default write privileges.
revoke insert, update, delete, truncate, references, trigger on public.reputation_summary from anon, authenticated;
