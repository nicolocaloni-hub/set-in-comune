begin;
-- Operator-only account removal with three outcomes. Called from the operator's
-- own Supabase connection (postgres role); never granted to app users.
--   libero     : full erasure only when nothing is shared with other people
--   anonimizza : login, profile data, photos and unused listings go; shared
--                rentals, chats and reviews stay for the other party under
--                "Utente eliminato"
--   tutto      : shared rentals, chats, reviews and reports are deleted too
alter table private.account_erasure_jobs add column mode text not null default 'standard' check(mode in('standard','anonymize'));

create function private.admin_erasure_preview(p_user uuid) returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object(
 'esiste',exists(select 1 from auth.users where id=p_user),
 'annunci',(select count(*) from public.listings where owner_id=p_user),
 'noleggi_aperti',(select count(*) from public.bookings where p_user in(owner_id,renter_id) and status in('requested','accepted')),
 'noleggi_in_corso',(select count(*) from public.bookings where p_user in(owner_id,renter_id) and status in('collected','returned')),
 'noleggi_chiusi',(select count(*) from public.bookings where p_user in(owner_id,renter_id) and status in('completed','declined','cancelled')),
 'chat',(select count(*) from public.inquiries where p_user in(owner_id,renter_id)),
 'recensioni',(select count(*) from public.rental_reviews where p_user in(reviewer_id,reviewee_id)),
 'segnalazioni',(select count(*) from private.user_reports where p_user in(reporter_id,reported_id)),
 'gestore',exists(select 1 from private.app_moderators where user_id=p_user),
 'dati_condivisi',private.erasure_needs_review(p_user),
 'cancellazione',(select status from private.account_erasure_jobs where user_id=p_user));
$$;

create function private.admin_queue_erasure(p_user uuid,p_mode text) returns void language plpgsql security definer set search_path='' as $$begin
 insert into private.account_erasure_jobs(user_id,mode) values(p_user,p_mode)
 on conflict(user_id) do update set status='queued',mode=excluded.mode,attempts=0,next_attempt=now(),lease=null,lease_until=null,finished_at=null;
 -- The operator decided: an open self-service request needs no further review.
 update private.privacy_requests set status='completed',response='Cancellazione eseguita dal gestore.',updated_at=now() where user_id=p_user and status in('open','reviewing');
end;$$;

create function private.admin_erase_account(p_user uuid,p_mode text) returns jsonb language plpgsql security definer set search_path='' as $$
declare job text;
begin
 if p_mode is null or p_mode not in('libero','anonimizza','tutto') then raise exception 'Modalità non valida.';end if;
 if not exists(select 1 from auth.users where id=p_user) then raise exception 'Account non trovato.';end if;
 perform 1 from public.profiles where id=p_user for update;
 select status into job from private.account_erasure_jobs where user_id=p_user;
 if job='done' then return jsonb_build_object('status','gia_eliminato');end if;
 if job in('queued','processing') then return jsonb_build_object('status','in_corso');end if;
 if p_mode='libero' then
  if private.erasure_needs_review(p_user) then return jsonb_build_object('status','bloccato','motivo','Ha noleggi, chat, segnalazioni o il ruolo di gestore.');end if;
  perform private.admin_queue_erasure(p_user,'standard');
  return jsonb_build_object('status','in_coda');
 end if;
 -- Equipment that is physically out must be closed by the people involved first.
 if exists(select 1 from public.bookings where p_user in(owner_id,renter_id) and status in('collected','returned')) then
  return jsonb_build_object('status','bloccato','motivo','Ha un noleggio in corso: l’attrezzatura non è ancora stata restituita e confermata.');
 end if;
 -- Pending and accepted rentals can no longer happen.
 update public.bookings set status='cancelled',updated_at=now() where p_user in(owner_id,renter_id) and status in('requested','accepted');
 delete from private.app_moderators where user_id=p_user;
 if p_mode='anonimizza' then
  perform private.admin_queue_erasure(p_user,'anonymize');
  return jsonb_build_object('status','in_coda');
 end if;
 -- tutto: remove everything shared with other people, then the normal erasure applies.
 delete from public.notifications where booking_id in(select id from public.bookings where p_user in(owner_id,renter_id))
  or conversation_id in(select id from public.inquiries where p_user in(owner_id,renter_id))
  or message_id in(select id from public.messages where sender_id=p_user)
  or inquiry_message_id in(select id from public.inquiry_messages where sender_id=p_user);
 delete from private.user_reports where p_user in(reporter_id,reported_id)
  or booking_id in(select id from public.bookings where p_user in(owner_id,renter_id))
  or conversation_id in(select id from public.inquiries where p_user in(owner_id,renter_id))
  or listing_id in(select id from public.listings where owner_id=p_user);
 delete from public.rental_reviews where p_user in(reviewer_id,reviewee_id) or booking_id in(select id from public.bookings where p_user in(owner_id,renter_id));
 delete from public.handoffs where actor_id=p_user or booking_id in(select id from public.bookings where p_user in(owner_id,renter_id));
 delete from public.messages where sender_id=p_user or booking_id in(select id from public.bookings where p_user in(owner_id,renter_id));
 delete from public.bookings where p_user in(owner_id,renter_id);
 delete from public.inquiry_messages where sender_id=p_user or conversation_id in(select id from public.inquiries where p_user in(owner_id,renter_id));
 delete from public.inquiries where p_user in(owner_id,renter_id) or listing_id in(select id from public.listings where owner_id=p_user);
 perform private.admin_queue_erasure(p_user,'standard');
 return jsonb_build_object('status','in_coda');
end;$$;

-- Worker step for mode 'anonymize', after the user's files are gone from Storage.
create function private.anonymize_account_records(p_user uuid,p_lease uuid) returns void language plpgsql security definer set search_path='' as $$begin
 perform 1 from private.account_erasure_jobs where user_id=p_user and lease=p_lease and status='processing' and mode='anonymize' and lease_until>now() for update;
 if not found then raise exception 'Lavorazione scaduta.';end if;
 if exists(select 1 from storage.objects where bucket_id in('profile-photos','listing-photos','handoff-photos') and (storage.foldername(name))[1]=p_user::text) then raise exception 'File ancora presenti.';end if;
 -- Listings nobody rented go; rented ones stay hidden (account_open is false) for the other party's history.
 delete from public.listings l where l.owner_id=p_user and not exists(select 1 from public.bookings b where b.listing_id=l.id)
  and not exists(select 1 from public.inquiries i where i.listing_id=l.id) and not exists(select 1 from private.user_reports r where r.listing_id=l.id);
 update public.profiles set display_name='Utente eliminato',bio='',avatar_url='',portfolio_links='{}' where id=p_user;
 update public.bookings set renter_name='Utente eliminato' where renter_id=p_user;
 update public.handoffs set photos='{}' where actor_id=p_user;
 delete from public.notifications where user_id=p_user;
 delete from public.saved_searches where user_id=p_user;
 delete from private.push_subscriptions where user_id=p_user;
 delete from private.user_blocks where p_user in(blocker_id,blocked_id);
 delete from private.privacy_requests where user_id=p_user;
 delete from private.action_limits where user_id=p_user;
 delete from auth.identities where user_id=p_user;
end;$$;

create or replace function private.claim_account_erasures() returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 with picked as(select user_id from private.account_erasure_jobs where status in('queued','processing') and next_attempt<=now() and (lease_until is null or lease_until<now()) and attempts<12 order by created_at for update skip locked limit 5), updated as(update private.account_erasure_jobs j set status='processing',attempts=attempts+1,lease=gen_random_uuid(),lease_until=now()+interval '5 minutes' from picked p where j.user_id=p.user_id returning j.user_id,j.lease,j.mode)
 select coalesce(jsonb_agg(to_jsonb(u)),'[]'::jsonb) into result from updated u;return result;
end;$$;

create function public.anonymize_account_records(p_user uuid,p_lease uuid) returns void language sql security invoker set search_path='' as $$select private.anonymize_account_records(p_user,p_lease);$$;
revoke all on function private.admin_erasure_preview(uuid),private.admin_queue_erasure(uuid,text),private.admin_erase_account(uuid,text),private.anonymize_account_records(uuid,uuid),public.anonymize_account_records(uuid,uuid) from public,anon,authenticated;
grant execute on function private.anonymize_account_records(uuid,uuid),public.anonymize_account_records(uuid,uuid) to service_role;
commit;
