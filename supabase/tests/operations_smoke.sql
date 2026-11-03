-- Operator-only rehearsal on the actual schema. Everything is rolled back.
-- No physical uploads, SMTP, external replies, production-role changes or COMMIT.
begin;
set local statement_timeout='20s';
select set_config('app.ops_reporter',gen_random_uuid()::text,true),
       set_config('app.ops_owner',gen_random_uuid()::text,true),
       set_config('app.ops_moderator',gen_random_uuid()::text,true),
       set_config('app.ops_other',gen_random_uuid()::text,true);
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
select current_setting(k)::uuid,'ops-smoke-'||current_setting(k)||'@example.invalid',now(),
       '{"display_name":"Operational test only"}'::jsonb
from unnest(array['app.ops_reporter','app.ops_owner','app.ops_moderator','app.ops_other']) k;
insert into private.app_moderators(user_id) values(current_setting('app.ops_moderator')::uuid);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('app.ops_owner'),true),
       set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.ops_owner'),'role','authenticated')::text,true);
do $$declare d jsonb;begin
 d:=public.my_legal_status();perform public.accept_legal_documents(d->>'version',d->>'terms_hash',d->>'privacy_hash',true,true,true);
end$$;
with l as (
 insert into public.listings(owner_id,title,category,zone,description,price,accessories,conditions,images)
 values(auth.uid(),'Operational test listing','Camere','Prati','Temporary listing, never committed or published',0,'Borsa','Test only',
 array['https://srjdysdhxnafjrutufmk.supabase.co/storage/v1/object/public/listing-photos/'||auth.uid()||'/'||gen_random_uuid()||'.jpg']) returning id
) select set_config('app.ops_listing',id::text,true) from l;
select set_config('request.jwt.claim.sub',current_setting('app.ops_reporter'),true),
       set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.ops_reporter'),'role','authenticated')::text,true);
select public.submit_report(current_setting('app.ops_owner')::uuid,'Annuncio sospetto','Operational fixture, no actual complaint',current_setting('app.ops_listing')::uuid,null,null);
do $$declare d jsonb;begin
 d:=public.safety_settings();
 if (d->>'moderator')::boolean or jsonb_array_length(d->'reports')<>1 then raise exception 'Reporter status isolation failed';end if;
 begin perform public.moderation_queue();raise exception 'Moderator queue bypass';exception when raise_exception then if sqlerrm<>'Non autorizzato.' then raise;end if;end;
 begin perform public.privacy_queue();raise exception 'Privacy queue bypass';exception when raise_exception then if sqlerrm<>'Non autorizzato.' then raise;end if;end;
 if has_table_privilege('authenticated','private.user_reports','SELECT') or has_table_privilege('authenticated','private.privacy_requests','SELECT') then raise exception 'Private table exposed';end if;
 perform public.request_erasure();
 if public.request_erasure()<>(public.my_privacy_requests()->0->>'id')::uuid then raise exception 'Duplicate privacy case';end if;
end$$;
reset role;
select set_config('app.ops_report',(select id::text from private.user_reports where reporter_id=current_setting('app.ops_reporter')::uuid),true),
       set_config('app.ops_privacy',(select id::text from private.privacy_requests where user_id=current_setting('app.ops_reporter')::uuid),true);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('app.ops_other'),true),
       set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.ops_other'),'role','authenticated')::text,true);
do $$begin
 if (public.safety_settings()->'reports')<>'[]'::jsonb or public.my_privacy_requests()<>'[]'::jsonb then raise exception 'Other user cases leaked';end if;
 begin perform public.resolve_report(current_setting('app.ops_report')::uuid,'resolved','Unauthorized fixture');raise exception 'Resolve bypass';exception when raise_exception then if sqlerrm<>'Non autorizzato.' then raise;end if;end;
 begin perform public.respond_privacy_request(current_setting('app.ops_privacy')::uuid,'completed','Unauthorized fixture response');raise exception 'Respond bypass';exception when raise_exception then if sqlerrm<>'Non autorizzato.' then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub',current_setting('app.ops_moderator'),true),
       set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.ops_moderator'),'role','authenticated')::text,true);
do $$declare r jsonb;p jsonb;begin
 if not (public.safety_settings()->>'moderator')::boolean then raise exception 'Moderator not recognized';end if;
 select x into r from jsonb_array_elements(public.moderation_queue()) x where x->>'id'=current_setting('app.ops_report');
 if r is null then raise exception 'Report missing from operator queue';end if;
 select x into p from jsonb_array_elements(public.privacy_queue()) x where x->>'id'=current_setting('app.ops_privacy');
 if p is null or (p->>'response_due')::timestamptz<>(p->>'created_at')::timestamptz+interval '1 month' then raise exception 'Privacy due date missing';end if;
 begin perform public.resolve_report(current_setting('app.ops_report')::uuid,'invalid','Fixture');raise exception 'Invalid report status allowed';exception when raise_exception then if sqlerrm<>'Stato o nota non validi.' then raise;end if;end;
 begin perform public.respond_privacy_request(current_setting('app.ops_privacy')::uuid,'completed','short');raise exception 'Short response allowed';exception when raise_exception then if sqlerrm<>'Inserisci uno stato e un riscontro da 20 a 2000 caratteri.' then raise;end if;end;
 perform public.resolve_report(current_setting('app.ops_report')::uuid,'reviewing','Fixture taken in charge');
 perform public.respond_privacy_request(current_setting('app.ops_privacy')::uuid,'reviewing','Fixture taken in charge, no data erased.');
end$$;
-- A privileged manual intervention is separate from merely closing a report.
-- No irreversible deletion or account ban is part of this rehearsal.
reset role;
do $$begin
 if not exists(select 1 from private.app_moderators where user_id=current_setting('app.ops_moderator')::uuid) then raise exception 'Operator identity missing';end if;
 update public.listings set active=false where id=current_setting('app.ops_listing')::uuid and owner_id=current_setting('app.ops_owner')::uuid;
 if not found then raise exception 'Manual pause did not affect fixture';end if;
end$$;
set local role anon;
select set_config('request.jwt.claim.sub','',true),set_config('request.jwt.claims','{"role":"anon"}',true);
do $$begin
 if exists(select 1 from public.listings where id=current_setting('app.ops_listing')::uuid) then raise exception 'Paused fixture still public';end if;
 if has_function_privilege('anon','public.moderation_queue()','EXECUTE') or has_function_privilege('anon','public.privacy_queue()','EXECUTE') then raise exception 'Anonymous operator RPC';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('app.ops_owner'),true),
       set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.ops_owner'),'role','authenticated')::text,true);
update public.listings set active=true where id=current_setting('app.ops_listing')::uuid and owner_id=current_setting('app.ops_owner')::uuid;
set local role anon;
do $$begin
 if not exists(select 1 from public.listings where id=current_setting('app.ops_listing')::uuid) then raise exception 'Fixture restoration failed';end if;
end$$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('app.ops_moderator'),true),
       set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.ops_moderator'),'role','authenticated')::text,true);
select public.resolve_report(current_setting('app.ops_report')::uuid,'resolved','Fixture resolved after verified reversible intervention');
select public.respond_privacy_request(current_setting('app.ops_privacy')::uuid,'completed','Fixture response only: closing this case does not delete an account.');
select set_config('request.jwt.claim.sub',current_setting('app.ops_reporter'),true),
       set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.ops_reporter'),'role','authenticated')::text,true);
do $$declare d jsonb;begin
 if public.safety_settings()->'reports'->0->>'status'<>'resolved' then raise exception 'Reporter cannot see outcome';end if;
 if public.my_privacy_requests()->0->>'status'<>'completed' or public.my_privacy_requests()->0->>'response' not like 'Fixture response only:%' then raise exception 'Requester response missing';end if;
 d:=public.export_my_data();
 if d->'profile'->>'id'<>auth.uid()::text or not exists(select 1 from public.profiles where id=auth.uid()) then raise exception 'Case closure erased account';end if;
 if d::text like '%access_token%' or d::text like '%p256dh%' then raise exception 'Credentials in export';end if;
end$$;
reset role;
-- Backdate only the temporary cases and verify the manual retention boundary.
update private.user_reports set updated_at=now()-interval '13 months' where id=current_setting('app.ops_report')::uuid;
update private.privacy_requests set updated_at=now()-interval '13 months' where id=current_setting('app.ops_privacy')::uuid;
do $$begin
 if (select count(*) from private.user_reports where id=current_setting('app.ops_report')::uuid and status in('resolved','dismissed') and updated_at<now()-interval '12 months')<>1 then raise exception 'Closed report review boundary';end if;
 if (select count(*) from private.privacy_requests where id=current_setting('app.ops_privacy')::uuid and status in('completed','limited') and updated_at<now()-interval '12 months')<>1 then raise exception 'Closed privacy review boundary';end if;
 update private.user_reports set status='reviewing' where id=current_setting('app.ops_report')::uuid;
 if exists(select 1 from private.user_reports where id=current_setting('app.ops_report')::uuid and status in('resolved','dismissed') and updated_at<now()-interval '12 months') then raise exception 'Open case retention exclusion failed';end if;
end$$;
select jsonb_build_object('operations_smoke_passed',true,'moderator_and_stranger_isolation',true,
 'report_and_privacy_lifecycle',true,'manual_pause_and_restoration',true,
 'case_closure_is_not_account_erasure',true,'export_owner_and_no_credentials',true,
 'closed_case_retention_boundaries',true,'physical_uploads',false,'external_messages_sent',false,
 'fixtures_persisted',false,'test_mode','SQL roles in one transaction, not signed HTTP or phone UI') as result;
rollback;
