-- Run only through an operator connection. All fixtures roll back; no emails or pushes.
begin;
select set_config('app.smoke_owner',gen_random_uuid()::text,true),
       set_config('app.smoke_renter',gen_random_uuid()::text,true),
       set_config('app.smoke_other',gen_random_uuid()::text,true);
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
select current_setting(k)::uuid,'smoke-'||current_setting(k)||'@example.invalid',now(),'{"display_name":"Temporary smoke fixture"}'::jsonb
from unnest(array['app.smoke_owner','app.smoke_renter','app.smoke_other']) k;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('app.smoke_owner'),true),
       set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.smoke_owner'),'role','authenticated')::text,true);
with inserted as (
 insert into public.listings(owner_id,title,category,zone,description,price,accessories,conditions,images)
 values(current_setting('app.smoke_owner')::uuid,'Temporary smoke camera','Camere','Prati','Temporary integration verification only',20,'Borsa','Ritiro concordato',
 array['https://srjdysdhxnafjrutufmk.supabase.co/storage/v1/object/public/listing-photos/'||current_setting('app.smoke_owner')||'/'||gen_random_uuid()||'.jpg']) returning id
) select set_config('app.smoke_listing',id::text,true) from inserted;
select set_config('request.jwt.claim.sub',current_setting('app.smoke_renter'),true),
       set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.smoke_renter'),'role','authenticated')::text,true);
select set_config('app.smoke_booking',id::text,true) from public.request_booking(current_setting('app.smoke_listing')::uuid,current_date+10,current_date+11,'Initial request note');
select set_config('request.jwt.claim.sub',current_setting('app.smoke_owner'),true),
       set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.smoke_owner'),'role','authenticated')::text,true);
do $$begin
 if (public.notification_counts()->>'requests')::int<>1 or (public.notification_counts()->>'messages')::int<>0 then raise exception 'Request notification or duplicate suppression failed';end if;
end$$;
insert into public.messages(booking_id,sender_id,body) values(current_setting('app.smoke_booking')::uuid,current_setting('app.smoke_owner')::uuid,'Temporary reply');
select set_config('request.jwt.claim.sub',current_setting('app.smoke_other'),true),
       set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.smoke_other'),'role','authenticated')::text,true);
do $$begin
 if exists(select 1 from public.notifications) then raise exception 'Notifications leaked to another account';end if;
 if has_function_privilege('authenticated','public.push_worker_config()','execute') or has_function_privilege('anon','public.notification_counts()','execute') then raise exception 'Unexpected API privilege';end if;
end$$;
select set_config('request.jwt.claim.sub',current_setting('app.smoke_renter'),true),
       set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.smoke_renter'),'role','authenticated')::text,true);
do $$begin
 if (public.notification_counts()->>'messages')::int<>1 then raise exception 'Recipient unread count failed';end if;
end$$;
select public.read_notifications(current_setting('app.smoke_booking')::uuid,'message',now());
do $$begin
 if (public.notification_counts()->>'messages')::int<>0 then raise exception 'Read cursor failed';end if;
end$$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('app.smoke_renter'),true),set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.smoke_renter'),'role','authenticated')::text,true);
select set_config('app.smoke_inquiry',public.contact_listing(current_setting('app.smoke_listing')::uuid,'Una domanda prima di prenotare')::text,true);
select set_config('request.jwt.claim.sub',current_setting('app.smoke_other'),true),set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.smoke_other'),'role','authenticated')::text,true);
do $$begin if exists(select 1 from public.inquiry_messages) then raise exception 'Inquiry isolation failed';end if;end$$;
reset role;
update public.bookings set status='completed' where id=current_setting('app.smoke_booking')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('app.smoke_renter'),true),set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.smoke_renter'),'role','authenticated')::text,true);
select public.submit_review(current_setting('app.smoke_booking')::uuid,5,'Recensione temporanea del test remoto');
select public.submit_report(current_setting('app.smoke_owner')::uuid,'Altro','Segnalazione temporanea per il test remoto',current_setting('app.smoke_listing')::uuid,null,null);
select public.set_user_block(current_setting('app.smoke_owner')::uuid,true);
do $$begin
 if jsonb_array_length(public.safety_settings()->'blocked')<>1 then raise exception 'Block not saved';end if;
 begin perform public.contact_listing(current_setting('app.smoke_listing')::uuid,'Messaggio bloccato');raise exception 'Block bypass';exception when raise_exception then if sqlerrm='Block bypass' then raise;end if;end;
 if cardinality(public.my_reviewed_bookings())<>1 then raise exception 'Review ownership failed';end if;
end$$;
reset role;
set local role anon;
do $$begin
 if (select average_rating from public.reputation_summary where reviewee_id=current_setting('app.smoke_owner')::uuid)<>5 then raise exception 'Public reputation unavailable';end if;
 if has_function_privilege('anon','public.contact_listing(uuid,text)','execute') then raise exception 'Unexpected anonymous mutation';end if;
end$$;
reset role;
select 'PASS: remote inquiries, reputation, review ownership, blocking, reports and public read; all fixtures rolled back' as result;
rollback;
