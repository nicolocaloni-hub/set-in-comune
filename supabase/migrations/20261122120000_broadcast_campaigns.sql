-- Announcement emails written from the manager panel (owner request, 22 November 2026).
-- The panel stores subject and HTML here; broadcast-email reads them by slug and sends
-- through the same test-first, never-twice flow of private.claim_broadcast.
begin;

create table private.broadcast_campaigns(
 slug text primary key check(slug ~ '^[a-z0-9-]{3,60}$'),
 subject text not null check(char_length(trim(subject)) between 3 and 150),
 html text not null check(char_length(html) between 20 and 300000),
 text_body text check(text_body is null or char_length(text_body)<=50000),
 created_at timestamptz not null default now()
);
alter table private.broadcast_campaigns enable row level security;

create function private.get_broadcast_campaign(p_slug text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('subject',subject,'html',html,'text',text_body) from private.broadcast_campaigns where slug=p_slug;
$$;
create function public.get_broadcast_campaign(p_slug text) returns jsonb language sql stable security invoker set search_path='' as $$select private.get_broadcast_campaign(p_slug);$$;

revoke all on function private.get_broadcast_campaign(text),public.get_broadcast_campaign(text) from public,anon,authenticated;
grant execute on function private.get_broadcast_campaign(text),public.get_broadcast_campaign(text) to service_role;

commit;
