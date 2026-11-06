// Shared PGlite harness for SQL tests of new migrations.
// Loads the schema in the same order it was applied to production, publishes a
// legal release and lets tests act as confirmed users who accepted it.
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

export const PRODUCTION_ORDER=[
 '001_initial.sql',
 'migrations/20261030174113_notifications.sql',
 'migrations/20261031103706_marketplace_trust_and_inquiries.sql',
 'migrations/20261031141946_privacy_rights_and_upload_cleanup.sql',
 'migrations/20261031153855_automatic_account_erasure.sql',
 'launch/legal_acceptance.sql',
 'migrations/20261103073928_listing_archive.sql'
];
export const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',C='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const sql=file=>readFile(new URL('../supabase/'+file,import.meta.url),'utf8');

export async function createDb({migrations=[],users=[[A,'Alice'],[B,'Bruno'],[C,'Carla']]}={}){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create schema storage;create schema vault;create schema net;create schema cron;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('role',current_setting('request.jwt.claim.role',true))$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,metadata jsonb default '{}');
 create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;
 alter table storage.objects enable row level security;
 grant usage on schema public,auth,storage to anon,authenticated,service_role;grant select on storage.objects to anon,authenticated;grant insert,delete on storage.objects to authenticated;
 create table vault.decrypted_secrets(id uuid primary key,decrypted_secret text);
 create table net.requests(id bigserial,url text,body jsonb,headers jsonb);
 create function net.http_post(url text,body jsonb,headers jsonb,timeout_milliseconds integer) returns bigint language plpgsql as $$declare n bigint;begin insert into net.requests(url,body,headers) values(url,body,headers) returning id into n;return n;end;$$;
 create table cron.jobs(name text primary key,schedule text,command text);
 create function cron.schedule(text,text,text) returns bigint language sql as $$insert into cron.jobs values($1,$2,$3) on conflict(name) do update set schedule=excluded.schedule,command=excluded.command;select 1::bigint$$;`);
 for(const file of PRODUCTION_ORDER)await db.exec(await sql(file));
 for(const [id,name] of users)await db.query('insert into auth.users values($1,now(),$2)',[id,JSON.stringify({display_name:name})]);
 await db.query("insert into private.legal_releases(version,terms_text,privacy_text,published_at,active) values('test-1','Condizioni di prova.','Informativa di prova.',now(),true)");
 const as=(uid,fn,role='authenticated')=>db.transaction(async tx=>{await tx.exec('set local role '+role);await tx.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role',$2,true)",[uid||'',role]);return fn(tx);});
 for(const [id] of users)await as(id,async tx=>{const s=(await tx.query('select public.my_legal_status() s')).rows[0].s;await tx.query('select public.accept_legal_documents($1,$2,$3,true,true,true)',[s.version,s.terms_hash,s.privacy_hash]);});
 for(const file of migrations)await db.exec(await sql(file));
 const listing=(owner,extra={})=>as(owner,tx=>tx.query(`insert into public.listings(owner_id,title,category,zone,description,price,deposit,accessories,conditions,images${Object.keys(extra).map(k=>','+k).join('')}) values($1,'Camera di prova','Camere','Prati','Attrezzatura usata soltanto per il test',20,100,'Borsa','Ritiro concordato',$2${Object.keys(extra).map((_,i)=>',$'+(i+3)).join('')}) returning *`,[owner,['https://example.supabase.co/storage/v1/object/public/listing-photos/'+owner+'/'+C+'.jpg'],...Object.values(extra)])).then(r=>r.rows[0]);
 return {db,as,listing,close:()=>db.close()};
}
