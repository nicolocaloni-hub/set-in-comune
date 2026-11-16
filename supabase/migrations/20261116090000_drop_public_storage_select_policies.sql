-- Defence in depth: ensure no anonymous bucket-enumeration policies exist on storage.objects.
-- Public downloads use the public bucket URL and do not need these policies; no client code lists these buckets.
-- Already dropped by 20261031141946; this is an idempotent no-op where that migration ran.
drop policy if exists public_profile_images on storage.objects;
drop policy if exists public_listing_images on storage.objects;
