import test from 'node:test';
import assert from 'node:assert/strict';
import {createDb,A,B,C} from './db-harness.mjs';

const MIGRATIONS=['migrations/20261122100000_broadcast_emails.sql','migrations/20261122120000_broadcast_campaigns.sql'];

test('panel campaigns are stored privately and validated',async t=>{
 const {db,close}=await createDb({migrations:MIGRATIONS});t.after(close);
 await db.query("insert into private.broadcast_campaigns(slug,subject,html) values('c-20261122-1200','Novità','<p>Ciao a tutti, novità in arrivo</p>')");
 assert.equal((await db.query("select private.get_broadcast_campaign('c-20261122-1200')->>'subject' s")).rows[0].s,'Novità');
 await assert.rejects(db.query("insert into private.broadcast_campaigns(slug,subject,html) values('Bad Slug','Ok ok','<p>abcdefghijklmnopqrstuv</p>')"));
 await assert.rejects(db.query("insert into private.broadcast_campaigns(slug,subject,html) values('c-vuota','Ok ok','')"));
 const r=(await db.query(`select has_function_privilege('authenticated','public.get_broadcast_campaign(text)','execute') a,has_function_privilege('anon','private.get_broadcast_campaign(text)','execute') b`)).rows[0];
 assert.deepEqual(r,{a:false,b:false});
});
const CAMPAIGN='lancio-community-2026-11';

test('announcements: test copy first, then everyone eligible exactly once',async t=>{
 const {db,close}=await createDb({migrations:MIGRATIONS});t.after(close);
 await db.query(`update auth.users set email=case id when $1 then 'a@example.test' when $2 then 'b@example.test' else 'c@example.test' end`,[A,B]);
 await db.query('insert into private.app_moderators(user_id) values($1)',[A]);
 const claim=async mode=>(await db.query('select private.claim_broadcast($1,$2) r',[CAMPAIGN,mode])).rows[0].r;
 const finish=(mode,p,ok=true)=>db.query('select private.finish_broadcast($1,$2,$3,$4,$5)',[CAMPAIGN,mode,p.userId,p.lease,ok]);

 await assert.rejects(claim('all'),/copia di prova/);
 const test1=await claim('test');assert.deepEqual(test1.map(p=>p.email),['a@example.test']);
 assert.deepEqual(await claim('test'),[],'a copy being sent is not claimed twice');
 await finish('test',test1[0]);

 await db.query("update auth.users set email='eliminato-x@rent-to-a-friend.invalid' where id=$1",[C]);
 await db.query('insert into private.email_optouts(user_id) values($1)',[B]);
 let all=await claim('all');assert.deepEqual(all.map(p=>p.email),['a@example.test']);
 await finish('all',all[0],false);
 all=await claim('all');assert.equal(all.length,1,'a failed send can be retried');
 await finish('all',all[0]);
 assert.deepEqual(await claim('all'),[],'never twice');

 await assert.rejects(db.query("select private.claim_broadcast('Bad Name!','all')"),/non validi/);
 const r=(await db.query(`select has_function_privilege('authenticated','public.claim_broadcast(text,text)','execute') a,
  has_function_privilege('anon','private.start_broadcast(text,text)','execute') b`)).rows[0];
 assert.deepEqual(r,{a:false,b:false});
});
