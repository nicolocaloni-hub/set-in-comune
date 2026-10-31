begin;
create table private.privacy_requests(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 status text not null default 'open' check(status in('open','reviewing','completed','limited')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 response text not null default '' check(char_length(response)<=2000)
);
create index privacy_requests_user on private.privacy_requests(user_id,created_at desc);
create unique index privacy_one_pending on private.privacy_requests(user_id) where status in('open','reviewing');
alter table private.privacy_requests enable row level security;
revoke all on private.privacy_requests from public,anon,authenticated;
create function private.request_erasure() returns uuid language plpgsql security definer set search_path='' as $$declare result uuid;begin
 if not private.is_confirmed_user() then raise exception 'Accedi con una email confermata.';end if;
 select id into result from private.privacy_requests where user_id=auth.uid() and status in('open','reviewing');
 if result is not null then return result;end if;
 perform private.enforce_rate_limit('privacy_request',5,interval '1 day');
 insert into private.privacy_requests(user_id) values(auth.uid()) on conflict(user_id) where status in('open','reviewing') do update set user_id=excluded.user_id returning id into result;
 return result;
end;$$;
create function private.my_privacy_requests() returns jsonb language plpgsql security definer set search_path='' as $$begin
 if not private.is_confirmed_user() then raise exception 'Accedi con una email confermata.';end if;
 return coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from (select id,status,created_at,updated_at,response from private.privacy_requests where user_id=auth.uid()) r),'[]'::jsonb);
end;$$;
create function private.privacy_queue() returns jsonb language plpgsql security definer set search_path='' as $$begin
 if not private.is_confirmed_user() or not exists(select 1 from private.app_moderators where user_id=auth.uid()) then raise exception 'Non autorizzato.';end if;
 return coalesce((select jsonb_agg(to_jsonb(r)) from(select r.*,u.email,r.created_at+interval '1 month' response_due from private.privacy_requests r join auth.users u on u.id=r.user_id order by r.created_at limit 200) r),'[]'::jsonb);
end;$$;
create function private.respond_privacy_request(p_request uuid,p_status text,p_response text) returns void language plpgsql security definer set search_path='' as $$begin
 if not private.is_confirmed_user() or not exists(select 1 from private.app_moderators where user_id=auth.uid()) then raise exception 'Non autorizzato.';end if;
 if p_status is null or p_status not in('reviewing','completed','limited') or p_response is null or char_length(trim(p_response)) not between 20 and 2000 then raise exception 'Inserisci uno stato e un riscontro da 20 a 2000 caratteri.';end if;
 update private.privacy_requests set status=p_status,response=trim(p_response),updated_at=now() where id=p_request;
 if not found then raise exception 'Richiesta non trovata.';end if;
end;$$;
-- Return only the caller's unreferenced objects. Deletion must use Storage API, never SQL.
create function private.unused_uploads() returns jsonb language plpgsql security definer set search_path='' as $$begin
 if not private.is_confirmed_user() then raise exception 'Accedi con una email confermata.';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('bucket',o.bucket_id,'path',o.name)) from storage.objects o
 where o.created_at<now()-interval '1 hour' and (storage.foldername(o.name))[1]=auth.uid()::text and (
 (o.bucket_id='profile-photos' and not exists(select 1 from public.profiles p where p.avatar_url like '%/storage/v1/object/public/profile-photos/'||o.name)) or
 (o.bucket_id='listing-photos' and not exists(select 1 from public.listings l where exists(select 1 from unnest(l.images) i where i like '%/storage/v1/object/public/listing-photos/'||o.name))) or
 (o.bucket_id='handoff-photos' and not exists(select 1 from public.handoffs h where o.name=any(h.photos)))
 )),'[]'::jsonb);
end;$$;
create function public.request_erasure() returns uuid language sql security invoker set search_path='' as $$select private.request_erasure();$$;
create function public.my_privacy_requests() returns jsonb language sql security invoker set search_path='' as $$select private.my_privacy_requests();$$;
create function public.privacy_queue() returns jsonb language sql security invoker set search_path='' as $$select private.privacy_queue();$$;
create function public.respond_privacy_request(p_request uuid,p_status text,p_response text) returns void language sql security invoker set search_path='' as $$select private.respond_privacy_request(p_request,p_status,p_response);$$;
create function public.unused_uploads() returns jsonb language sql security invoker set search_path='' as $$select private.unused_uploads();$$;
create function public.export_my_data() returns jsonb language plpgsql security invoker set search_path='' as $$declare result jsonb;begin
 if not private.is_confirmed_user() then raise exception 'Accedi con una email confermata.';end if;
 select jsonb_build_object('exported_at',now(),'profile',(select to_jsonb(p) from public.profiles p where id=auth.uid()),
 'listings',coalesce((select jsonb_agg(to_jsonb(l)) from public.listings l where owner_id=auth.uid()),'[]'::jsonb),
 'bookings',coalesce((select jsonb_agg(to_jsonb(b)) from public.bookings b),'[]'::jsonb),
 'rental_messages',coalesce((select jsonb_agg(to_jsonb(m)) from public.messages m),'[]'::jsonb),
 'inquiries',coalesce((select jsonb_agg(to_jsonb(q)) from public.inquiries q),'[]'::jsonb),
 'inquiry_messages',coalesce((select jsonb_agg(to_jsonb(m)) from public.inquiry_messages m),'[]'::jsonb),
 'handoffs',coalesce((select jsonb_agg(to_jsonb(h)) from public.handoffs h),'[]'::jsonb),
 'reviews',coalesce((select jsonb_agg(to_jsonb(r)) from(select id,reviewer_id,reviewee_id,rating,body,created_at from public.rental_reviews where reviewer_id=auth.uid() or reviewee_id=auth.uid())r),'[]'::jsonb),
 'safety',public.safety_settings(),'privacy_requests',public.my_privacy_requests()) into result;
 return result;
end;$$;
revoke all on function private.request_erasure(),private.my_privacy_requests(),private.privacy_queue(),private.respond_privacy_request(uuid,text,text),private.unused_uploads(),public.request_erasure(),public.my_privacy_requests(),public.privacy_queue(),public.respond_privacy_request(uuid,text,text),public.unused_uploads(),public.export_my_data() from public,anon,authenticated;
grant execute on function private.request_erasure(),private.my_privacy_requests(),private.privacy_queue(),private.respond_privacy_request(uuid,text,text),private.unused_uploads(),public.request_erasure(),public.my_privacy_requests(),public.privacy_queue(),public.respond_privacy_request(uuid,text,text),public.unused_uploads(),public.export_my_data() to authenticated;
-- Public downloads remain intentional, but anonymous bucket enumeration is unnecessary.
drop policy public_profile_images on storage.objects;
drop policy public_listing_images on storage.objects;
create policy own_public_upload_metadata on storage.objects for select to authenticated using(bucket_id in('profile-photos','listing-photos') and (storage.foldername(name))[1]=auth.uid()::text);
commit;
