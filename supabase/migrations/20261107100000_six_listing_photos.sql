-- Listings: up to six photos (was four), same as LISTING_PHOTO_MAX in src/photos.js.
-- Pickup/return evidence keeps its four-photo limit in transition_booking_checked.
-- Account and platform storage quotas (200 / 1500 photos) are unchanged.
-- Apply once, after 20261107094000_rental_kits.
begin;
alter table public.listings drop constraint listings_images_check;
alter table public.listings add constraint listings_images_check check (cardinality(images)<=6);
commit;
