-- Operator-only, aggregate report. This is not a migration, backup or public RPC.
-- Use only on the dedicated project srjdysdhxnafjrutufmk.
begin read only;
with app_buckets as (
  select id, public, file_size_limit, allowed_mime_types
  from storage.buckets
  where id in ('profile-photos','listing-photos','handoff-photos')
), sizes as (
  select bucket_id, count(*) as objects,
    coalesce(sum(case when metadata->>'size' ~ '^[0-9]+$'
      then (metadata->>'size')::numeric else 0 end),0) as known_bytes,
    count(*) filter (where metadata->>'size' is null
      or metadata->>'size' !~ '^[0-9]+$') as unknown_sizes
  from storage.objects group by bucket_id
)
select jsonb_build_object(
  'checked_at',now(),
  'database_bytes',pg_database_size(current_database()),
  'storage',coalesce((select jsonb_agg(jsonb_build_object(
    'bucket',b.id,'public',b.public,'file_size_limit',b.file_size_limit,
    'allowed_mime_types',b.allowed_mime_types,'objects',coalesce(s.objects,0),
    'known_bytes',coalesce(s.known_bytes,0),'unknown_sizes',coalesce(s.unknown_sizes,0)
  ) order by b.id) from app_buckets b left join sizes s on s.bucket_id=b.id),'[]'::jsonb),
  'other_bucket_objects',coalesce((select sum(objects) from sizes where bucket_id not in (select id from app_buckets)),0),
  'counts',jsonb_build_object(
    'profiles',(select count(*) from public.profiles),
    'listings',(select count(*) from public.listings),
    'bookings',(select count(*) from public.bookings),
    'active_legal_versions',(select count(*) from private.legal_releases where active),
    'legal_receipts',(select count(*) from private.legal_receipts),
    'operators',(select count(*) from private.app_moderators),
    'privacy_open',(select count(*) from private.privacy_requests where status in ('open','reviewing'))
  ),
  'erasure_jobs',coalesce((select jsonb_object_agg(status,n) from (select status,count(*) n from private.account_erasure_jobs group by status) q),'{}'::jsonb),
  'push_jobs',coalesce((select jsonb_object_agg(status,n) from (select status,count(*) n from private.push_jobs group by status) q),'{}'::jsonb),
  'storage_quota_trigger',coalesce((select t.tgenabled::text from pg_trigger t where t.tgrelid='storage.objects'::regclass and t.tgname='limit_app_photo_uploads'),'missing'),
  'tables_without_rls',coalesce((select jsonb_agg(n.nspname||'.'||c.relname order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and c.relkind in ('r','p') and not c.relrowsecurity),'[]'::jsonb),
  'public_definer_functions',coalesce((select jsonb_agg(p.proname order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef),'[]'::jsonb)
) as operational_status;
rollback;
