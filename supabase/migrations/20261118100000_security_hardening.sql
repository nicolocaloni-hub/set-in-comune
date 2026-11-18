-- Pre-launch security audit (18 November 2026).
-- Listing photos are already limited to the owner's own uploads by
-- private.listing_owner_name (trigger set_listing_owner); a regression test now covers it.

-- The reputation view is read-only: keep SELECT, drop the default write privileges.
revoke insert, update, delete, truncate, references, trigger on public.reputation_summary from anon, authenticated;
