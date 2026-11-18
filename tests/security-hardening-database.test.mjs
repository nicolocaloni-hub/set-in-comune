import test from 'node:test';
import assert from 'node:assert/strict';
import {createDb,A,B} from './db-harness.mjs';

const MIGRATIONS=['migrations/20261107100000_six_listing_photos.sql','migrations/20261118100000_security_hardening.sql'];
const photo=(owner,i=0)=>`https://example.supabase.co/storage/v1/object/public/listing-photos/${owner}/${String(i).padStart(8,'0')}-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg`;

test('listing photos must be the owner\'s own uploads',async t=>{
 const {as,listing,close}=await createDb({migrations:MIGRATIONS});t.after(close);
 const l=await listing(A);
 const setImages=images=>as(A,tx=>tx.query('update public.listings set images=$1 where id=$2 returning cardinality(images) n',[images,l.id]));
 assert.equal((await setImages([photo(A,0),photo(A,1)])).rows[0].n,2);
 assert.equal((await setImages([])).rows[0].n,0);
 await assert.rejects(setImages(['https://evil.example/track.jpg']),/foto dell'annuncio/);
 await assert.rejects(setImages([photo(B)]),/foto dell'annuncio/);
 await assert.rejects(setImages([photo(A).replace('listing-photos','profile-photos')]),/foto dell'annuncio/);
 await assert.rejects(setImages([photo(A)+'?x=1']),/foto dell'annuncio/);
});

test('reputation view is read-only for app roles',async t=>{
 const {db,close}=await createDb({migrations:MIGRATIONS});t.after(close);
 const r=(await db.query(`select has_table_privilege('anon','public.reputation_summary','SELECT') a_sel,
  has_table_privilege('anon','public.reputation_summary','INSERT') a_ins,
  has_table_privilege('authenticated','public.reputation_summary','UPDATE') u_upd,
  has_table_privilege('authenticated','public.reputation_summary','DELETE') u_del`)).rows[0];
 assert.deepEqual(r,{a_sel:true,a_ins:false,u_upd:false,u_del:false});
});
