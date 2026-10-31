begin;
alter table public.listings add column brand text not null default '' check(char_length(brand)<=40), add column model text not null default '' check(char_length(model)<=60), add column lens_mount text not null default '' check(lens_mount in('','Sony E','Canon RF','Canon EF','Nikon Z','Nikon F','Micro 4/3','L-Mount','PL','Altro')), add column light_power_w integer check(light_power_w between 1 and 20000), add column equipment_condition text not null default '' check(equipment_condition in('','Ottime','Buone','Segni di utilizzo')), add column included_tags text[] not null default '{}' check(cardinality(included_tags)<=8 and included_tags<@array['Batterie','Caricatore','Custodia','Stativo','Softbox','Scheda memoria','Microfono','Monitor']::text[] and array_position(included_tags,null) is null);
grant insert(brand,model,lens_mount,light_power_w,equipment_condition,included_tags),update(brand,model,lens_mount,light_power_w,equipment_condition,included_tags) on public.listings to authenticated;
alter table public.profiles add column completed_rentals integer not null default 0;
alter table public.handoffs add column checklist jsonb not null default '{}' check(jsonb_typeof(checklist)='object' and octet_length(checklist::text)<1000);

create table private.user_blocks(blocker_id uuid not null references public.profiles(id) on delete cascade,blocked_id uuid not null references public.profiles(id) on delete cascade,created_at timestamptz not null default now(),primary key(blocker_id,blocked_id),check(blocker_id<>blocked_id));
create index user_blocks_reverse on private.user_blocks(blocked_id,blocker_id);
alter table private.user_blocks enable row level security;
revoke all on private.user_blocks from public,anon,authenticated;
create function private.pair_blocked(a uuid,b uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from private.user_blocks where (blocker_id=a and blocked_id=b) or(blocker_id=b and blocked_id=a));$$;
create function private.guard_booking_contact() returns trigger language plpgsql security definer set search_path='' as $$begin if private.pair_blocked(new.owner_id,new.renter_id) then raise exception 'Non è possibile inviare richieste tra questi account.';end if;return new;end;$$;
create trigger guard_booking_contact before insert on public.bookings for each row execute function private.guard_booking_contact();
create function private.guard_booking_message() returns trigger language plpgsql security definer set search_path='' as $$declare b public.bookings;begin select * into b from public.bookings where id=new.booking_id;if private.pair_blocked(b.owner_id,b.renter_id) then raise exception 'Questa conversazione non può ricevere messaggi.';end if;return new;end;$$;
create trigger guard_booking_message before insert on public.messages for each row execute function private.guard_booking_message();

create table public.inquiries(id uuid primary key default gen_random_uuid(),listing_id uuid not null references public.listings(id),owner_id uuid not null references public.profiles(id),renter_id uuid not null references public.profiles(id),title text not null,created_at timestamptz not null default now(),check(owner_id<>renter_id),unique(listing_id,renter_id));
create index inquiries_owner on public.inquiries(owner_id,created_at desc);
create index inquiries_renter on public.inquiries(renter_id,created_at desc);
create table public.inquiry_messages(id uuid primary key default gen_random_uuid(),conversation_id uuid not null references public.inquiries(id),sender_id uuid not null references public.profiles(id),body text not null check(char_length(trim(body)) between 1 and 2000),created_at timestamptz not null default now());
create index inquiry_messages_conversation on public.inquiry_messages(conversation_id,created_at);
alter table public.inquiries enable row level security;
alter table public.inquiry_messages enable row level security;
revoke all on public.inquiries,public.inquiry_messages from public,anon,authenticated;
grant select on public.inquiries,public.inquiry_messages to authenticated;
grant insert(conversation_id,sender_id,body) on public.inquiry_messages to authenticated;
create policy inquiries_participants on public.inquiries for select to authenticated using(private.is_confirmed_user() and auth.uid() in(owner_id,renter_id));
create policy inquiry_messages_read on public.inquiry_messages for select to authenticated using(private.is_confirmed_user() and exists(select 1 from public.inquiries q where q.id=conversation_id and auth.uid() in(q.owner_id,q.renter_id)));
create policy inquiry_messages_insert on public.inquiry_messages for insert to authenticated with check(private.is_confirmed_user() and sender_id=auth.uid() and exists(select 1 from public.inquiries q where q.id=conversation_id and auth.uid() in(q.owner_id,q.renter_id)));
create function private.guard_inquiry_message() returns trigger language plpgsql security definer set search_path='' as $$declare q public.inquiries;begin perform private.enforce_rate_limit('message',5,interval '10 seconds');select * into q from public.inquiries where id=new.conversation_id;if private.pair_blocked(q.owner_id,q.renter_id) then raise exception 'Questa conversazione non può ricevere messaggi.';end if;return new;end;$$;
create trigger guard_inquiry_message before insert on public.inquiry_messages for each row execute function private.guard_inquiry_message();
create function private.contact_listing(p_listing uuid,p_body text) returns uuid language plpgsql security definer set search_path='' as $$declare l public.listings; q uuid;begin
 perform private.enforce_rate_limit('contact_listing',20,interval '1 hour');
 if p_body is null or char_length(trim(p_body)) not between 1 and 2000 then raise exception 'Scrivi un messaggio da 1 a 2000 caratteri.';end if;
 select * into l from public.listings where id=p_listing and active;if not found or l.owner_id=auth.uid() then raise exception 'Annuncio non disponibile per una nuova conversazione.';end if;
 if private.pair_blocked(l.owner_id,auth.uid()) then raise exception 'Questa conversazione non può ricevere messaggi.';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_listing::text||auth.uid()::text,812));
 select id into q from public.inquiries where listing_id=p_listing and renter_id=auth.uid();
 if q is null then insert into public.inquiries(listing_id,owner_id,renter_id,title) values(l.id,l.owner_id,auth.uid(),l.title) returning id into q;end if;
 insert into public.inquiry_messages(conversation_id,sender_id,body) values(q,auth.uid(),trim(p_body));return q;
end;$$;

alter table public.notifications alter column booking_id drop not null;
alter table public.notifications add column conversation_id uuid references public.inquiries(id),add column inquiry_message_id uuid references public.inquiry_messages(id),add constraint notification_target check((booking_id is not null and conversation_id is null and inquiry_message_id is null) or(booking_id is null and conversation_id is not null and message_id is null and kind='message' and inquiry_message_id is not null));
create unique index notification_inquiry_message on public.notifications(inquiry_message_id) where inquiry_message_id is not null;
create index notification_inquiry_unread on public.notifications(user_id,conversation_id,created_at) where read_at is null and conversation_id is not null;
create function private.notify_inquiry_message() returns trigger language plpgsql security definer set search_path='' as $$declare q public.inquiries;begin select * into q from public.inquiries where id=new.conversation_id;insert into public.notifications(user_id,conversation_id,kind,inquiry_message_id) values(case when new.sender_id=q.owner_id then q.renter_id else q.owner_id end,q.id,'message',new.id);return new;end;$$;
create trigger notify_inquiry_message after insert on public.inquiry_messages for each row execute function private.notify_inquiry_message();
create or replace function private.notification_counts() returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 if not private.is_confirmed_user() then raise exception 'Accedi per continuare.';end if;
 select jsonb_build_object('messages',count(*) filter(where kind='message'),'requests',count(*) filter(where kind='request'),'byBooking',coalesce((select jsonb_object_agg(thread_id,n) from(select coalesce(booking_id,conversation_id) thread_id,count(*) n from public.notifications where user_id=auth.uid() and read_at is null and kind='message' group by coalesce(booking_id,conversation_id)) x),'{}'::jsonb)) into result from public.notifications where user_id=auth.uid() and read_at is null;return result;
end;$$;
create function private.read_inquiry_notifications(p_conversation uuid,p_through timestamptz) returns void language plpgsql security definer set search_path='' as $$begin
 if not private.is_confirmed_user() or p_through is null then raise exception 'Lettura non valida.';end if;
 update public.notifications set read_at=now() where user_id=auth.uid() and conversation_id=p_conversation and read_at is null and created_at<=least(now(),p_through);
 update private.push_jobs j set status='failed' from public.notifications n where j.notification_id=n.id and n.user_id=auth.uid() and n.read_at is not null and j.status='pending';
end;$$;
create or replace function private.claim_push_jobs() returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Forbidden';end if;
 if not exists(select 1 from private.push_settings where enabled) then return '[]'::jsonb;end if;
 with picked as(select j.id from private.push_jobs j join public.notifications n on n.id=j.notification_id join private.push_subscriptions s on s.id=j.subscription_id
 where n.read_at is null and j.created_at>now()-interval '24 hours' and j.attempts<6 and j.next_attempt<=now() and(j.status='pending' or(j.status='sending' and j.lease_until<now())) and((n.kind='message' and s.messages) or(n.kind='request' and s.requests))
 order by j.created_at for update of j skip locked limit 20),claimed as(update private.push_jobs j set status='sending',attempts=attempts+1,lease_until=now()+interval '2 minutes',lease_token=gen_random_uuid() from picked where j.id=picked.id returning j.*)
 select coalesce(jsonb_agg(jsonb_build_object('jobId',j.id,'leaseToken',j.lease_token,'notificationId',n.id,'userId',n.user_id,'kind',n.kind,'bookingId',coalesce(n.booking_id,n.conversation_id),'threadType',case when n.conversation_id is not null then 'inquiry' else 'booking' end,'endpoint',s.endpoint,'p256dh',s.p256dh,'auth',s.auth_key,'unreadTotal',(select count(*) from public.notifications x where x.user_id=n.user_id and x.read_at is null))),'[]'::jsonb) into result from claimed j join public.notifications n on n.id=j.notification_id join private.push_subscriptions s on s.id=j.subscription_id;return result;
end;$$;

create table public.rental_reviews(id uuid primary key default gen_random_uuid(),booking_id uuid not null references public.bookings(id),reviewer_id uuid not null references public.profiles(id),reviewee_id uuid not null references public.profiles(id),rating integer not null check(rating between 1 and 5),body text not null check(char_length(trim(body)) between 10 and 1000),created_at timestamptz not null default now(),unique(booking_id,reviewer_id),check(reviewer_id<>reviewee_id));
create index rental_reviews_profile on public.rental_reviews(reviewee_id,created_at desc);
alter table public.rental_reviews enable row level security;
revoke all on public.rental_reviews from public,anon,authenticated;
grant select(id,reviewer_id,reviewee_id,rating,body,created_at) on public.rental_reviews to anon,authenticated;
create policy rental_reviews_public on public.rental_reviews for select to anon,authenticated using(true);
create view public.reputation_summary with(security_invoker=true) as select reviewee_id,count(rating)::integer review_count,round(avg(rating),1) average_rating from public.rental_reviews group by reviewee_id;
grant select on public.reputation_summary to anon,authenticated;
create function private.submit_review(p_booking uuid,p_rating integer,p_body text) returns void language plpgsql security definer set search_path='' as $$declare b public.bookings;target uuid;begin
 perform private.enforce_rate_limit('review_submit',10,interval '1 hour');select * into b from public.bookings where id=p_booking and auth.uid() in(owner_id,renter_id);
 if not found or b.status<>'completed' then raise exception 'Puoi recensire soltanto un tuo noleggio concluso.';end if;
 if p_rating is null or p_rating not between 1 and 5 or p_body is null or char_length(trim(p_body)) not between 10 and 1000 then raise exception 'Scegli da 1 a 5 stelle e scrivi da 10 a 1000 caratteri.';end if;
 target:=case when b.owner_id=auth.uid() then b.renter_id else b.owner_id end;
 insert into public.rental_reviews(booking_id,reviewer_id,reviewee_id,rating,body) values(b.id,auth.uid(),target,p_rating,trim(p_body));
end;$$;
create function private.refresh_completed_count() returns trigger language plpgsql security definer set search_path='' as $$begin
 update public.profiles p set completed_rentals=(select count(*) from public.bookings b where b.status='completed' and p.id in(b.owner_id,b.renter_id)) where p.id in(new.owner_id,new.renter_id);return new;
end;$$;
create trigger refresh_completed_count after insert or update of status on public.bookings for each row when(new.status='completed') execute function private.refresh_completed_count();

create table private.user_reports(id uuid primary key default gen_random_uuid(),reporter_id uuid not null references public.profiles(id),reported_id uuid not null references public.profiles(id),listing_id uuid references public.listings(id),booking_id uuid references public.bookings(id),conversation_id uuid references public.inquiries(id),reason text not null,details text not null check(char_length(trim(details)) between 10 and 2000),status text not null default 'open' check(status in('open','reviewing','resolved','dismissed')),moderator_note text not null default '',created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(reporter_id<>reported_id));
create index user_reports_reporter on private.user_reports(reporter_id,created_at desc);
create index user_reports_open on private.user_reports(status,created_at);
create table private.app_moderators(user_id uuid primary key references public.profiles(id),created_at timestamptz not null default now());
alter table private.user_reports enable row level security;alter table private.app_moderators enable row level security;
revoke all on private.user_reports,private.app_moderators from public,anon,authenticated;
create function private.set_user_block(p_user uuid,p_blocked boolean) returns void language plpgsql security definer set search_path='' as $$begin
 perform private.enforce_rate_limit('user_block',30,interval '1 hour');if p_user is null or p_user=auth.uid() or p_blocked is null or not exists(select 1 from public.profiles where id=p_user) then raise exception 'Profilo non valido.';end if;
 if p_blocked then insert into private.user_blocks values(auth.uid(),p_user,now()) on conflict do nothing;
 -- Suppress queued messages from this pair without erasing conversations or rental records.
 update private.push_jobs j set status='failed' from public.notifications n where j.notification_id=n.id and j.status in('pending','sending') and((n.booking_id in(select id from public.bookings where(owner_id=auth.uid() and renter_id=p_user)or(owner_id=p_user and renter_id=auth.uid())))or(n.conversation_id in(select id from public.inquiries where(owner_id=auth.uid() and renter_id=p_user)or(owner_id=p_user and renter_id=auth.uid()))));
 else delete from private.user_blocks where blocker_id=auth.uid() and blocked_id=p_user;end if;
end;$$;
create function private.safety_settings() returns jsonb language plpgsql security definer set search_path='' as $$begin
 if not private.is_confirmed_user() then raise exception 'Accedi per continuare.';end if;
 return jsonb_build_object('blocked',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.display_name)) from private.user_blocks b join public.profiles p on p.id=b.blocked_id where b.blocker_id=auth.uid()),'[]'::jsonb),'reports',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',p.display_name,'reason',r.reason,'status',r.status,'created_at',r.created_at)) from private.user_reports r join public.profiles p on p.id=r.reported_id where r.reporter_id=auth.uid()),'[]'::jsonb),'moderator',exists(select 1 from private.app_moderators where user_id=auth.uid()));
end;$$;
create function private.submit_report(p_user uuid,p_reason text,p_details text,p_listing uuid default null,p_booking uuid default null,p_conversation uuid default null) returns void language plpgsql security definer set search_path='' as $$begin
 perform private.enforce_rate_limit('user_report',10,interval '1 day');
 if p_user is null or p_user=auth.uid() or not exists(select 1 from public.profiles where id=p_user) or p_reason is null or p_reason not in('Comportamento inappropriato','Annuncio sospetto','Informazioni non corrette','Spam','Problema durante il noleggio','Altro') or p_details is null or char_length(trim(p_details)) not between 10 and 2000 then raise exception 'Controlla il motivo e la descrizione della segnalazione.';end if;
 if p_listing is not null and not exists(select 1 from public.listings where id=p_listing and owner_id=p_user) then raise exception 'Annuncio non valido.';end if;
 if p_booking is not null and not exists(select 1 from public.bookings where id=p_booking and((owner_id=auth.uid() and renter_id=p_user)or(owner_id=p_user and renter_id=auth.uid()))) then raise exception 'Noleggio non valido.';end if;
 if p_conversation is not null and not exists(select 1 from public.inquiries where id=p_conversation and((owner_id=auth.uid() and renter_id=p_user)or(owner_id=p_user and renter_id=auth.uid()))) then raise exception 'Conversazione non valida.';end if;
 insert into private.user_reports(reporter_id,reported_id,listing_id,booking_id,conversation_id,reason,details) values(auth.uid(),p_user,p_listing,p_booking,p_conversation,p_reason,trim(p_details));
end;$$;
create function private.moderation_queue() returns jsonb language plpgsql security definer set search_path='' as $$begin
 if not private.is_confirmed_user() or not exists(select 1 from private.app_moderators where user_id=auth.uid()) then raise exception 'Non autorizzato.';end if;
 return coalesce((select jsonb_agg(to_jsonb(r)) from(select r.id,r.reported_id,r.reporter_id,r.reason,r.details,r.status,r.created_at,r.moderator_note,p.display_name reported_name from private.user_reports r join public.profiles p on p.id=r.reported_id order by r.created_at desc limit 100) r),'[]'::jsonb);
end;$$;
create function private.resolve_report(p_report uuid,p_status text,p_note text) returns void language plpgsql security definer set search_path='' as $$begin
 if not private.is_confirmed_user() or not exists(select 1 from private.app_moderators where user_id=auth.uid()) then raise exception 'Non autorizzato.';end if;
 if p_status is null or p_status not in('reviewing','resolved','dismissed') or p_note is null or char_length(p_note)>1000 then raise exception 'Stato o nota non validi.';end if;
 update private.user_reports set status=p_status,moderator_note=p_note,updated_at=now() where id=p_report;if not found then raise exception 'Segnalazione non trovata.';end if;
end;$$;

create function private.transition_booking_checked(p_booking uuid,p_status text,p_note text,p_photos text[],p_checklist jsonb) returns void language plpgsql security definer set search_path='' as $$declare b public.bookings;l public.listings;listing_uuid uuid;is_owner boolean;allowed boolean:=false;begin
 if not private.is_confirmed_user() then raise exception 'Accedi con una email confermata per continuare.';end if;
 perform private.enforce_rate_limit('booking_transition',60,interval '1 hour');select listing_id into listing_uuid from public.bookings where id=p_booking and auth.uid() in(owner_id,renter_id);if listing_uuid is null then raise exception 'Prenotazione non trovata.';end if;
 select * into l from public.listings where id=listing_uuid for update;select * into b from public.bookings where id=p_booking for update;is_owner:=b.owner_id=auth.uid();
 allowed:=case b.status when 'requested' then(is_owner and p_status in('accepted','declined'))or(not is_owner and p_status='cancelled') when 'accepted' then(is_owner and p_status='collected')or p_status='cancelled' when 'collected' then not is_owner and p_status='returned' when 'returned' then is_owner and p_status='completed' else false end;
 if not coalesce(allowed,false) then raise exception 'Passaggio di stato non consentito.';end if;
 if p_note is null or char_length(p_note)>2000 or p_photos is null or cardinality(p_photos)>4 then raise exception 'Note o foto non valide.';end if;
 if p_status in('collected','returned','completed') and(p_checklist is null or p_checklist->'equipment' is distinct from 'true'::jsonb or p_checklist->'accessories' is distinct from 'true'::jsonb or p_checklist->'condition' is distinct from 'true'::jsonb) then raise exception 'Completa tutti i controlli della consegna o restituzione.';end if;
 if exists(select 1 from unnest(p_photos) p where p is null or p not like auth.uid()::text||'/'||p_booking::text||'/%' or not exists(select 1 from storage.objects o where o.bucket_id='handoff-photos' and o.name=p)) then raise exception 'Foto non appartenenti al noleggio.';end if;
 if p_status='accepted' then if b.start_date<current_date then raise exception 'La richiesta è scaduta.';end if;if exists(select 1 from public.bookings where listing_id=b.listing_id and id<>b.id and status in('accepted','collected','returned') and start_date<=b.end_date and end_date>=b.start_date) or exists(select 1 from jsonb_array_elements(l.blocked) x where(x->>'start_date')::date<=b.end_date and(x->>'end_date')::date>=b.start_date) then raise exception 'Queste date sono già occupate.';end if;end if;
 update public.bookings set status=p_status,updated_at=now() where id=b.id;
 insert into public.handoffs(booking_id,actor_id,stage,note,photos,checklist) values(b.id,auth.uid(),p_status,p_note,p_photos,case when p_status in('collected','returned','completed') then jsonb_build_object('equipment',true,'accessories',true,'condition',true) else '{}'::jsonb end);
end;$$;
create or replace function private.transition_booking(p_booking uuid,p_status text,p_note text default '',p_photos text[] default '{}') returns void language sql security invoker set search_path='' as $$select private.transition_booking_checked(p_booking,p_status,p_note,p_photos,'{}'::jsonb);$$;

-- API invoker wrappers, explicit grants; no moderator is assigned by this migration.
create function public.contact_listing(p_listing uuid,p_body text) returns uuid language sql security invoker set search_path='' as $$select private.contact_listing(p_listing,p_body);$$;
create function public.read_inquiry_notifications(p_conversation uuid,p_through timestamptz) returns void language sql security invoker set search_path='' as $$select private.read_inquiry_notifications(p_conversation,p_through);$$;
create function public.submit_review(p_booking uuid,p_rating integer,p_body text) returns void language sql security invoker set search_path='' as $$select private.submit_review(p_booking,p_rating,p_body);$$;
create function public.set_user_block(p_user uuid,p_blocked boolean) returns void language sql security invoker set search_path='' as $$select private.set_user_block(p_user,p_blocked);$$;
create function public.safety_settings() returns jsonb language sql security invoker set search_path='' as $$select private.safety_settings();$$;
create function public.submit_report(p_user uuid,p_reason text,p_details text,p_listing uuid default null,p_booking uuid default null,p_conversation uuid default null) returns void language sql security invoker set search_path='' as $$select private.submit_report(p_user,p_reason,p_details,p_listing,p_booking,p_conversation);$$;
create function public.moderation_queue() returns jsonb language sql security invoker set search_path='' as $$select private.moderation_queue();$$;
create function public.resolve_report(p_report uuid,p_status text,p_note text) returns void language sql security invoker set search_path='' as $$select private.resolve_report(p_report,p_status,p_note);$$;
create function public.transition_booking_checked(p_booking uuid,p_status text,p_note text default '',p_photos text[] default '{}',p_checklist jsonb default '{}') returns void language sql security invoker set search_path='' as $$select private.transition_booking_checked(p_booking,p_status,p_note,p_photos,p_checklist);$$;
revoke execute on function private.pair_blocked(uuid,uuid),private.guard_booking_contact(),private.guard_booking_message(),private.guard_inquiry_message(),private.notify_inquiry_message(),private.refresh_completed_count() from public,anon,authenticated;
revoke execute on function private.contact_listing(uuid,text),private.read_inquiry_notifications(uuid,timestamptz),private.submit_review(uuid,integer,text),private.set_user_block(uuid,boolean),private.safety_settings(),private.submit_report(uuid,text,text,uuid,uuid,uuid),private.moderation_queue(),private.resolve_report(uuid,text,text),private.transition_booking_checked(uuid,text,text,text[],jsonb) from public,anon,authenticated;
grant execute on function private.contact_listing(uuid,text),private.read_inquiry_notifications(uuid,timestamptz),private.submit_review(uuid,integer,text),private.set_user_block(uuid,boolean),private.safety_settings(),private.submit_report(uuid,text,text,uuid,uuid,uuid),private.moderation_queue(),private.resolve_report(uuid,text,text),private.transition_booking_checked(uuid,text,text,text[],jsonb) to authenticated;
revoke all on function public.contact_listing(uuid,text),public.read_inquiry_notifications(uuid,timestamptz),public.submit_review(uuid,integer,text),public.set_user_block(uuid,boolean),public.safety_settings(),public.submit_report(uuid,text,text,uuid,uuid,uuid),public.moderation_queue(),public.resolve_report(uuid,text,text),public.transition_booking_checked(uuid,text,text,text[],jsonb) from public,anon,authenticated;
grant execute on function public.contact_listing(uuid,text),public.read_inquiry_notifications(uuid,timestamptz),public.submit_review(uuid,integer,text),public.set_user_block(uuid,boolean),public.safety_settings(),public.submit_report(uuid,text,text,uuid,uuid,uuid),public.moderation_queue(),public.resolve_report(uuid,text,text),public.transition_booking_checked(uuid,text,text,text[],jsonb) to authenticated;

create function private.my_reviewed_bookings() returns uuid[] language plpgsql security definer set search_path='' as $$begin if not private.is_confirmed_user() then raise exception 'Accedi per continuare.';end if;return coalesce((select array_agg(booking_id) from public.rental_reviews where reviewer_id=auth.uid()),'{}'::uuid[]);end;$$;
create function public.my_reviewed_bookings() returns uuid[] language sql security invoker set search_path='' as $$select private.my_reviewed_bookings();$$;
revoke all on function private.my_reviewed_bookings(),public.my_reviewed_bookings() from public,anon,authenticated;
grant execute on function private.my_reviewed_bookings(),public.my_reviewed_bookings() to authenticated;
commit;
