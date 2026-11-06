import test from 'node:test';
import assert from 'node:assert/strict';
import {createDb,A,B} from './db-harness.mjs';

const MIGRATIONS=['migrations/20261107090000_profile_portfolio.sql','migrations/20261107091000_duration_pricing.sql','migrations/20261107092000_rental_reminders.sql','migrations/20261107093000_saved_searches.sql','migrations/20261107094000_rental_kits.sql','migrations/20261107100000_six_listing_photos.sql'];
const photos=(owner,n)=>Array.from({length:n},(_,i)=>`https://example.supabase.co/storage/v1/object/public/listing-photos/${owner}/${String(i).padStart(8,'0')}-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg`);

test('listings accept up to six photos, handoffs still four',async t=>{
 const {as,listing,close}=await createDb({migrations:MIGRATIONS});t.after(close);
 const l=await listing(A);
 const setImages=n=>as(A,tx=>tx.query('update public.listings set images=$1 where id=$2 returning cardinality(images) n',[photos(A,n),l.id]));
 assert.equal((await setImages(6)).rows[0].n,6);
 await assert.rejects(setImages(7),/listings_images_check/);
 const booking=(await as(B,tx=>tx.query("select (public.request_booking($1,current_date+5,current_date+6,'')).id id",[l.id]))).rows[0].id;
 await assert.rejects(as(A,tx=>tx.query("select public.transition_booking_checked($1,'accepted','',$2::text[],'{}'::jsonb)",[booking,Array(5).fill('x')])),/Note o foto non valide/);
});
