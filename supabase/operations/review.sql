-- Operator-only manual review. Aggregate counts only; this never deletes data.
-- These are review candidates, not authorization to erase cases or shared data.
begin read only;
set local statement_timeout='15s';
with open_cases as (
  select booking_id,conversation_id,listing_id from private.user_reports where status in ('open','reviewing')
), closed_bookings as (
  select b.* from public.bookings b
  where b.status in ('completed','declined','cancelled') and b.updated_at<now()-interval '24 months'
  and not exists(select 1 from open_cases c where c.booking_id=b.id or c.listing_id=b.listing_id)
), inactive_inquiries as (
  select i.id from public.inquiries i
  where greatest(i.created_at,coalesce((select max(m.created_at) from public.inquiry_messages m where m.conversation_id=i.id),i.created_at))<now()-interval '12 months'
  and not exists(select 1 from public.bookings b where b.listing_id=i.listing_id and b.renter_id=i.renter_id)
  and not exists(select 1 from open_cases c where c.conversation_id=i.id or c.listing_id=i.listing_id)
), old_read_notifications as (
  select n.id from public.notifications n where n.read_at is not null
  and greatest(n.created_at,n.read_at)<now()-interval '90 days'
  and not exists(select 1 from public.bookings b where b.id=n.booking_id and b.status in ('requested','accepted','collected','returned'))
  and not exists(select 1 from open_cases c where c.booking_id=n.booking_id or c.conversation_id=n.conversation_id)
)
select jsonb_build_object(
  'checked_at',now(),'mode','manual_review_only','deletion_executed',false,
  'moderator_accounts',(select count(*) from private.app_moderators),
  'open_reports',(select count(*) from private.user_reports where status in ('open','reviewing')),
  'open_privacy_requests',(select count(*) from private.privacy_requests where status in ('open','reviewing')),
  'privacy_requests_past_one_month',(select count(*) from private.privacy_requests where status in ('open','reviewing') and created_at+interval '1 month'<now()),
  'closed_reports_review_12_months',(select count(*) from private.user_reports r where r.status in ('resolved','dismissed') and r.updated_at<now()-interval '12 months'
     and not exists(select 1 from public.bookings b where b.id=r.booking_id and b.status in ('requested','accepted','collected','returned'))),
  'closed_privacy_review_12_months',(select count(*) from private.privacy_requests where status in ('completed','limited') and updated_at<now()-interval '12 months'),
  'closed_bookings_review_24_months',(select count(*) from closed_bookings),
  'inquiries_review_12_months',(select count(*) from inactive_inquiries),
  'read_notifications_review_90_days',(select count(*) from old_read_notifications),
  'app_storage_objects',(select count(*) from storage.objects where bucket_id in ('listing-photos','profile-photos','handoff-photos')),
  'external_checks','Email, provider logs, external backups, legal holds and physical Storage copies require separate review'
) as operations_review;
rollback;
