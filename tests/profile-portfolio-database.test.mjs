import test from 'node:test';
import assert from 'node:assert/strict';
import {createDb,A,B} from './db-harness.mjs';

test('portfolio links are public, owner-editable and constrained in SQL',async t=>{
 const {as,close}=await createDb({migrations:['migrations/20261107090000_profile_portfolio.sql']});t.after(close);
 const set=(uid,target,links)=>as(uid,tx=>tx.query('update public.profiles set portfolio_links=$2 where id=$1 returning id',[target,links]));

 await t.test('the owner saves up to four https links and anyone can read them',async()=>{
  assert.equal((await set(A,A,['https://vimeo.com/123','https://www.imdb.com/name/nm1/'])).rows.length,1);
  const anon=await as(null,tx=>tx.query('select portfolio_links from public.profiles where id=$1',[A]),'anon');
  assert.deepEqual(anon.rows[0].portfolio_links,['https://vimeo.com/123','https://www.imdb.com/name/nm1/']);
 });
 await t.test('another user cannot change the links',async()=>{
  assert.equal((await set(B,A,['https://evil.example/'])).rows.length,0);
  const row=await as(A,tx=>tx.query('select portfolio_links from public.profiles where id=$1',[A]));
  assert.equal(row.rows[0].portfolio_links.length,2);
 });
 await t.test('invalid values are refused by the constraint',async()=>{
  for(const links of [['http://vimeo.com/1'],['javascript:alert(1)'],['https://a.it/ x'],['https://a.it/<script>'],['https://a.it/'+'x'.repeat(300)],['https://a.it/','https://b.it/','https://c.it/','https://d.it/','https://e.it/'],[null]])
   await assert.rejects(set(A,A,links),/portfolio_links_valid|null/,JSON.stringify(links));
 });
 await t.test('anonymous visitors cannot write',async()=>{
  await assert.rejects(as(null,tx=>tx.query("update public.profiles set portfolio_links='{}' where id=$1",[A]),'anon'),/permission denied/);
 });
 await t.test('the data export includes the links',async()=>{
  const data=(await as(A,tx=>tx.query('select public.export_my_data() d'))).rows[0].d;
  assert.equal(data.profile.portfolio_links.length,2);
 });
});
