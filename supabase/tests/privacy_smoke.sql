-- Operator-only smoke test. Temporary Auth/database records are rolled back; no emails, pushes or files.
begin;
select set_config('app.privacy_a',gen_random_uuid()::text,true),set_config('app.privacy_b',gen_random_uuid()::text,true);
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
select current_setting(k)::uuid,'privacy-smoke-'||current_setting(k)||'@example.invalid',now(),'{"display_name":"Temporary privacy fixture"}'::jsonb from unnest(array['app.privacy_a','app.privacy_b']) k;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('app.privacy_a'),true),set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.privacy_a'),'role','authenticated')::text,true);
do $$declare r uuid;d jsonb;begin
 r:=public.request_erasure();if public.request_erasure()<>r then raise exception 'Duplicate privacy request';end if;
 if jsonb_array_length(public.my_privacy_requests())<>1 then raise exception 'Own request missing';end if;
 d:=public.export_my_data();if d->'profile'->>'id'<>auth.uid()::text then raise exception 'Export owner mismatch';end if;
 if d::text like '%p256dh%' or d::text like '%access_token%' then raise exception 'Secret field in export';end if;
 if public.unused_uploads()<>'[]'::jsonb then raise exception 'Unexpected fixture uploads';end if;
 begin perform public.privacy_queue();raise exception 'Queue bypass';exception when raise_exception then if sqlerrm<>'Non autorizzato.' then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub',current_setting('app.privacy_b'),true),set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.privacy_b'),'role','authenticated')::text,true);
do $$begin
 if public.my_privacy_requests()<>'[]'::jsonb then raise exception 'Other request leaked';end if;
 if has_table_privilege('authenticated','private.privacy_requests','SELECT') then raise exception 'Direct table grant';end if;
 if has_function_privilege('anon','public.export_my_data()','EXECUTE') then raise exception 'Anonymous export';end if;
end$$;
reset role;
select 'PASS: request isolation, idempotence, export ownership, unused uploads and operator authorization' result;
rollback;
