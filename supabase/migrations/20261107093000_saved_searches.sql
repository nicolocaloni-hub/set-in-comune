-- Saved searches with alerts: when a listing becomes visible and matches a saved
-- search of another user, that user gets a 'search' notification (push follows
-- the "requests" preference, never counted in unread badges).
-- Requires 20261107092000_rental_reminders. Apply once, then redeploy the
-- push-dispatch Edge Function, which must accept the 'search' kind.
begin;
create table public.saved_searches(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
 label text not null check(char_length(trim(label)) between 1 and 80),
 filters jsonb not null constraint saved_search_filters check(
  jsonb_typeof(filters)='object' and octet_length(filters::text)<=1000 and filters<>'{}'::jsonb
  and (filters-array['query','category','zone','max_price','brand','mount','accessory','condition']::text[])='{}'::jsonb
  and (filters->'max_price' is null or (jsonb_typeof(filters->'max_price')='number' and (filters->>'max_price')::numeric between 0 and 10000))
  and coalesce(jsonb_typeof(filters->'query'),'string')='string' and char_length(coalesce(filters->>'query',''))<=80
  and coalesce(jsonb_typeof(filters->'category'),'string')='string' and char_length(coalesce(filters->>'category',''))<=40
  and coalesce(jsonb_typeof(filters->'zone'),'string')='string' and char_length(coalesce(filters->>'zone',''))<=40
  and coalesce(jsonb_typeof(filters->'brand'),'string')='string' and char_length(coalesce(filters->>'brand',''))<=40
  and coalesce(jsonb_typeof(filters->'mount'),'string')='string' and char_length(coalesce(filters->>'mount',''))<=40
  and coalesce(jsonb_typeof(filters->'accessory'),'string')='string' and char_length(coalesce(filters->>'accessory',''))<=40
  and coalesce(jsonb_typeof(filters->'condition'),'string')='string' and char_length(coalesce(filters->>'condition',''))<=40
 ),
 alerts boolean not null default true,
 created_at timestamptz not null default now()
);
create index saved_searches_user on public.saved_searches(user_id,created_at desc);
alter table public.saved_searches enable row level security;
revoke all on public.saved_searches from public,anon,authenticated;
grant select,delete on public.saved_searches to authenticated;
grant insert(label,filters,alerts),update(label,alerts) on public.saved_searches to authenticated;
create policy saved_searches_owner on public.saved_searches for all to authenticated
 using(private.is_confirmed_user() and user_id=(select auth.uid()))
 with check(private.is_confirmed_user() and user_id=(select auth.uid()));
create function private.limit_saved_searches() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform private.enforce_rate_limit('saved_search',30,interval '1 hour');
 if (select count(*) from public.saved_searches where user_id=new.user_id)>=10 then raise exception 'Puoi salvare fino a 10 ricerche.';end if;
 return new;
end;$$;
create trigger limit_saved_searches before insert on public.saved_searches for each row execute function private.limit_saved_searches();

-- Search notifications point to a listing instead of a booking or conversation.
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check(kind in ('message','request','reminder','search'));
alter table public.notifications add column listing_id uuid references public.listings(id) on delete cascade;
alter table public.notifications drop constraint notification_target;
alter table public.notifications add constraint notification_target check(
 (kind<>'search' and listing_id is null and ((booking_id is not null and conversation_id is null and inquiry_message_id is null) or(booking_id is null and conversation_id is not null and message_id is null and kind='message' and inquiry_message_id is not null)))
 or(kind='search' and listing_id is not null and booking_id is null and conversation_id is null and message_id is null and inquiry_message_id is null));
create unique index notification_search_unique on public.notifications(listing_id,user_id) where kind='search';

-- Same filters as the catalog, except the neighbourhood is an exact match.
create function private.search_matches(f jsonb,l public.listings) returns boolean language sql stable set search_path='' as $$
 select (f->>'category' is null or f->>'category'=l.category)
 and (f->>'zone' is null or f->>'zone'=l.zone)
 and (f->'max_price' is null or l.price<=(f->>'max_price')::numeric)
 and (f->>'brand' is null or lower(l.brand)=lower(f->>'brand'))
 and (f->>'mount' is null or l.lens_mount=f->>'mount')
 and (f->>'accessory' is null or (f->>'accessory')=any(l.included_tags))
 and (f->>'condition' is null or l.equipment_condition=f->>'condition')
 and (f->>'query' is null or position(lower(f->>'query') in lower(l.title||' '||l.description||' '||l.brand||' '||l.model))>0)
$$;
create function private.notify_saved_searches() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not new.active or new.archived then return new;end if;
 if tg_op='UPDATE' and old.active and not old.archived then return new;end if;
 insert into public.notifications(user_id,listing_id,kind)
 select distinct s.user_id,new.id,'search' from public.saved_searches s
 where s.alerts and s.user_id<>new.owner_id and private.account_open(s.user_id)
  and not private.pair_blocked(s.user_id,new.owner_id) and private.search_matches(s.filters,new)
 on conflict(listing_id,user_id) where kind='search' do nothing;
 return new;
end;$$;
create trigger notify_saved_searches after insert or update of active,archived on public.listings for each row execute function private.notify_saved_searches();

create or replace function private.enqueue_push() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into private.push_jobs(notification_id,subscription_id)
 select new.id,s.id from private.push_subscriptions s where s.user_id=new.user_id
  and ((new.kind='message' and s.messages) or(new.kind in ('request','reminder','search') and s.requests));
 if found then perform private.wake_push_worker();end if;
 return new;
end; $$;

create or replace function private.claim_push_jobs() returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Forbidden';end if;
 if not exists(select 1 from private.push_settings where enabled) then return '[]'::jsonb;end if;
 with picked as(select j.id from private.push_jobs j join public.notifications n on n.id=j.notification_id join private.push_subscriptions s on s.id=j.subscription_id
 where n.read_at is null and j.created_at>now()-interval '24 hours' and j.attempts<6 and j.next_attempt<=now() and(j.status='pending' or(j.status='sending' and j.lease_until<now())) and((n.kind='message' and s.messages) or(n.kind in ('request','reminder','search') and s.requests))
 order by j.created_at for update of j skip locked limit 20),claimed as(update private.push_jobs j set status='sending',attempts=attempts+1,lease_until=now()+interval '2 minutes',lease_token=gen_random_uuid() from picked where j.id=picked.id returning j.*)
 select coalesce(jsonb_agg(jsonb_build_object('jobId',j.id,'leaseToken',j.lease_token,'notificationId',n.id,'userId',n.user_id,'kind',n.kind,'reminderStage',n.reminder_stage,'listingId',n.listing_id,'bookingId',coalesce(n.booking_id,n.conversation_id),'threadType',case when n.conversation_id is not null then 'inquiry' else 'booking' end,'endpoint',s.endpoint,'p256dh',s.p256dh,'auth',s.auth_key,'unreadTotal',(select count(*) from public.notifications x where x.user_id=n.user_id and x.read_at is null and x.kind in ('message','request')))),'[]'::jsonb) into result from claimed j join public.notifications n on n.id=j.notification_id join private.push_subscriptions s on s.id=j.subscription_id;return result;
end;$$;

-- Data export now includes saved searches.
create or replace function public.export_my_data() returns jsonb language plpgsql security invoker set search_path='' as $$declare result jsonb;begin
 if not private.is_confirmed_user() then raise exception 'Accedi con una email confermata.';end if;
 select jsonb_build_object('exported_at',now(),'profile',(select to_jsonb(p) from public.profiles p where id=auth.uid()),
 'listings',coalesce((select jsonb_agg(to_jsonb(l)) from public.listings l where owner_id=auth.uid()),'[]'::jsonb),
 'bookings',coalesce((select jsonb_agg(to_jsonb(b)) from public.bookings b),'[]'::jsonb),
 'rental_messages',coalesce((select jsonb_agg(to_jsonb(m)) from public.messages m),'[]'::jsonb),
 'inquiries',coalesce((select jsonb_agg(to_jsonb(q)) from public.inquiries q),'[]'::jsonb),
 'inquiry_messages',coalesce((select jsonb_agg(to_jsonb(m)) from public.inquiry_messages m),'[]'::jsonb),
 'handoffs',coalesce((select jsonb_agg(to_jsonb(h)) from public.handoffs h),'[]'::jsonb),
 'reviews',coalesce((select jsonb_agg(to_jsonb(r)) from(select id,reviewer_id,reviewee_id,rating,body,created_at from public.rental_reviews where reviewer_id=auth.uid() or reviewee_id=auth.uid())r),'[]'::jsonb),
 'saved_searches',coalesce((select jsonb_agg(to_jsonb(s)) from public.saved_searches s),'[]'::jsonb),
 'safety',public.safety_settings(),'privacy_requests',public.my_privacy_requests()) into result;
 return result;
end;$$;
revoke all on function private.limit_saved_searches(),private.search_matches(jsonb,public.listings),private.notify_saved_searches() from public,anon,authenticated;
commit;
