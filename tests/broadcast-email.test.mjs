import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CAMPAIGNS} from '../supabase/functions/broadcast-email/campaigns.mjs';
import {parseRequest,buildMessage,processBroadcast} from '../supabase/functions/broadcast-email/core.mjs';

const U='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',L='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

test('campaign module matches its HTML source and carries an opt-out',async()=>{
 for(const c of Object.values(CAMPAIGNS)){
  assert.equal(c.html,await readFile(new URL('../'+c.source,import.meta.url),'utf8'));
  assert.match(c.html,/rispondi «NO»/);assert.match(c.text,/rispondi «NO»/);
  assert.ok(!/data:image|<script|\{\{/.test(c.html));
 }
});

test('only known campaigns and modes are accepted',()=>{
 assert.deepEqual(parseRequest({campaign:'lancio-community-2026-11',mode:'test'}),{campaign:'lancio-community-2026-11',mode:'test'});
 for(const bad of [{},{campaign:'x',mode:'test'},{campaign:'lancio-community-2026-11',mode:'everyone'},{campaign:'__proto__',mode:'all'}])assert.throws(()=>parseRequest(bad));
 assert.throws(()=>buildMessage('lancio-community-2026-11','not-an-email'));
});

test('every claimed person is finished as sent or failed, never skipped silently',async()=>{
 const finished=[],sent=[];
 const io={claim:async()=>[{userId:U,email:'a@example.test',lease:L},{userId:U.replace('a','c'),email:'broken',lease:L},{userId:'bad',email:'x@example.test',lease:L}],
  send:async m=>{sent.push(m.to);},finish:async(...a)=>{finished.push(a);}};
 const r=await processBroadcast({campaign:'lancio-community-2026-11',mode:'test'},io);
 assert.deepEqual(r,{sent:1,failed:1});assert.deepEqual(sent,['a@example.test']);
 assert.deepEqual(finished.map(f=>f[4]),[true,false]);
});
