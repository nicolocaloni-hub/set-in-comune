-- Operator-only verification. All fixtures and publication roll back; no email/files/push.
begin;
select set_config('app.legal_a',gen_random_uuid()::text,true),set_config('app.legal_b',gen_random_uuid()::text,true),set_config('app.legal_version','smoke-'||gen_random_uuid()::text,true);
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
select current_setting(k)::uuid,'legal-smoke-'||current_setting(k)||'@example.invalid',now(),'{"display_name":"Temporary legal fixture","terms_accepted":true}'::jsonb from unnest(array['app.legal_a','app.legal_b']) k;
update private.legal_releases set active=false where active;
insert into private.legal_releases(version,terms_text,privacy_text,published_at,active) values(current_setting('app.legal_version'),'Condizioni temporanee: prova di accettazione, non una pubblicazione.','Informativa temporanea: prova senza dati persistenti.',now(),true);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('app.legal_a'),true),set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.legal_a'),'role','authenticated')::text,true);
do $$declare d jsonb;r jsonb;r2 jsonb;begin
 d:=public.my_legal_status();if (d->>'accepted')::boolean then raise exception 'Metadata acceptance bypass';end if;
 begin perform public.accept_legal_documents(d->>'version',d->>'terms_hash',d->>'privacy_hash',false,true,true);raise exception 'Unchecked terms accepted';exception when raise_exception then if sqlerrm='Unchecked terms accepted' then raise;end if;end;
 begin perform public.accept_legal_documents(d->>'version',repeat('0',64),d->>'privacy_hash',true,true,true);raise exception 'Hash bypass';exception when raise_exception then if sqlerrm='Hash bypass' then raise;end if;end;
 r:=public.accept_legal_documents(d->>'version',d->>'terms_hash',d->>'privacy_hash',true,true,true);
 r2:=public.accept_legal_documents(d->>'version',d->>'terms_hash',d->>'privacy_hash',true,true,true);
 if not (r->>'accepted')::boolean or r->>'receipt_id' is distinct from r2->>'receipt_id' or r->>'accepted_at' is distinct from r2->>'accepted_at' then raise exception 'Receipt/idempotence failure';end if;
 if jsonb_array_length(public.my_legal_receipts())<>1 then raise exception 'Own receipt missing';end if;
 if has_table_privilege('authenticated','private.legal_receipts','INSERT') or has_table_privilege('authenticated','private.legal_receipts','SELECT') or has_function_privilege('anon','public.my_legal_status()','EXECUTE') then raise exception 'Unexpected direct legal privileges';end if;
 update public.profiles set bio='Rettifica temporanea del test' where id=auth.uid();
end$$;
select set_config('request.jwt.claim.sub',current_setting('app.legal_b'),true),set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.legal_b'),'role','authenticated')::text,true);
do $$begin
 if public.my_legal_receipts()<>'[]'::jsonb or (public.my_legal_status()->>'accepted')::boolean then raise exception 'Other receipt leaked';end if;
 begin
  insert into public.listings(owner_id,title,category,zone,description,price,accessories,conditions,images) values(auth.uid(),'Temporary legal camera','Camere','Prati','Temporary remote legal verification',1,'Borsa','Ritiro concordato',array['https://srjdysdhxnafjrutufmk.supabase.co/storage/v1/object/public/listing-photos/'||auth.uid()::text||'/'||gen_random_uuid()::text||'.jpg']);
  raise exception 'New activity without receipt';
 exception when raise_exception then if sqlerrm not like 'Prima di creare nuove attività%' then raise;end if;end;
end$$;
reset role;
do $$begin
 begin update private.legal_releases set terms_text='Alterazione di una versione pubblicata' where version=current_setting('app.legal_version');raise exception 'Published snapshot modified';exception when raise_exception then if sqlerrm='Published snapshot modified' then raise;end if;end;
end$$;
rollback;
select jsonb_build_object('result','PASS: remote receipt, identity isolation, idempotence, declarations, hashes, immutability, new-activity gate and rectification; fixtures rolled back','residual_fixture_users',(select count(*) from auth.users where email like 'legal-smoke-%@example.invalid')) as verification;
