-- Operator connection only; fixtures and simulated database deletions are fully rolled back.
-- Does not invoke Storage delete, Auth admin delete or send email/push.
begin;
select set_config('app.erase_a',gen_random_uuid()::text,true),set_config('app.erase_b',gen_random_uuid()::text,true),set_config('app.erase_c',gen_random_uuid()::text,true);
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) select current_setting(k)::uuid,'erase-fixture-'||current_setting(k)||'@example.invalid',now(),'{"display_name":"Temporary erasure fixture"}'::jsonb from unnest(array['app.erase_a','app.erase_b','app.erase_c']) k;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('app.erase_a'),true),set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.erase_a'),'role','authenticated')::text,true);
with l as(insert into public.listings(owner_id,title,category,zone,description,price,accessories,conditions,images) values(current_setting('app.erase_a')::uuid,'Temporary erasure camera','Camere','Prati','Temporary erasure verification fixture',0,'Borsa','Ritiro concordato',array['https://srjdysdhxnafjrutufmk.supabase.co/storage/v1/object/public/listing-photos/'||current_setting('app.erase_a')||'/'||gen_random_uuid()||'.jpg']) returning id) select set_config('app.erase_listing',id::text,true) from l;
reset role;
do $$declare r jsonb;begin
 if has_function_privilege('authenticated','public.prepare_account_erasure(uuid)','EXECUTE') then raise exception 'Client erasure bypass';end if;
 r:=private.prepare_account_erasure(current_setting('app.erase_a')::uuid);if r->>'status'<>'queued' then raise exception 'Unexpected eligibility';end if;
end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('app.erase_a'),true),set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.erase_a'),'role','authenticated')::text,true);
do $$begin if private.is_confirmed_user() then raise exception 'Stale token access';end if;end$$;
select set_config('request.jwt.claim.sub',current_setting('app.erase_b'),true),set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.erase_b'),'role','authenticated')::text,true);
do $$begin
 if exists(select 1 from public.profiles where id=current_setting('app.erase_a')::uuid) then raise exception 'Closing profile visible';end if;
 if exists(select 1 from public.listings where id=current_setting('app.erase_listing')::uuid) then raise exception 'Closing listing visible';end if;
 begin perform public.contact_listing(current_setting('app.erase_listing')::uuid,'A new contact during closure');raise exception 'New relationship accepted';exception when raise_exception then if sqlerrm<>'Account in cancellazione. Contatta il gestore per assistenza.' then raise;end if;end;
end$$;
reset role;
do $$declare jobs jsonb;j jsonb;begin
 jobs:=private.claim_account_erasures();select e into j from jsonb_array_elements(jobs)e where e->>'user_id'=current_setting('app.erase_a');if j is null then raise exception 'Job not claimed';end if;
 if private.claim_account_erasures()<>'[]'::jsonb then raise exception 'Double lease';end if;
 perform private.erase_account_records(current_setting('app.erase_a')::uuid,(j->>'lease')::uuid);
 if exists(select 1 from public.profiles where id=current_setting('app.erase_a')::uuid) then raise exception 'Profile not removed';end if;
 if not exists(select 1 from public.profiles where id=current_setting('app.erase_b')::uuid) then raise exception 'Other account changed';end if;
 perform private.finish_account_erasure(current_setting('app.erase_a')::uuid,(j->>'lease')::uuid,true);
end$$;
select 'PASS: eligibility, client denial, stale JWT closure, hidden listings, new-contact rejection, leases and isolated record erasure' result;
rollback;
