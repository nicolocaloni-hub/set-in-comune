-- Portfolio links on public profiles: up to four https links (Vimeo, Instagram,
-- IMDb, a personal site...). Each link is a full https URL without spaces or
-- markup characters, at most 300 characters; the client normalises them first.
-- PostgreSQL caps regex repetition counts at 255, hence the split {0,250}{0,20}.
-- Apply once, after 20261103073928_listing_archive.
begin;
alter table public.profiles add column portfolio_links text[] not null default '{}'
 constraint portfolio_links_valid check (
  cardinality(portfolio_links)<=4
  and array_position(portfolio_links,null) is null
  and (cardinality(portfolio_links)=0 or array_to_string(portfolio_links,' ') ~
   '^https://([a-z0-9-]+\.)+[a-z]{2,24}/[^[:space:]<>"]{0,250}[^[:space:]<>"]{0,20}( https://([a-z0-9-]+\.)+[a-z]{2,24}/[^[:space:]<>"]{0,250}[^[:space:]<>"]{0,20}){0,3}$')
 );
grant update(portfolio_links) on public.profiles to authenticated;
-- Same per-user edit quota as the other public profile fields.
drop trigger fixed_profile_edit_quota on public.profiles;
create trigger fixed_profile_edit_quota before update of display_name,bio,zone,avatar_url,portfolio_links on public.profiles for each row execute function private.limit_own_profile_edit();
commit;
