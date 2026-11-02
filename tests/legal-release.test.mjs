import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

test('review package contains exact UTF-8 snapshots and refuses publishing an unreviewed proposal',async()=>{
 const candidate=spawnSync(process.execPath,['scripts/prepare-legal-release.mjs'],{encoding:'utf8'});assert.equal(candidate.status,0,candidate.stderr);
 const json=JSON.parse(await readFile(new URL('../legal-review/release-candidate.json',import.meta.url),'utf8'));
 assert.equal(json.status,'proposal-not-published');
 for(const [type,file] of [['terms','condizioni.txt'],['privacy','privacy.txt']]){
  const text=await readFile(new URL('../legal-review/'+file,import.meta.url),'utf8');
  assert.equal(text,json[type+'_text']);assert.equal(createHash('sha256').update(text,'utf8').digest('hex'),json[type+'_hash']);
 }
 assert.ok(json.terms_text.includes('https://rent-to-a-friend.it/#privacy'));
 assert.ok(json.privacy_text.includes('IONOS'));assert.ok(json.privacy_text.includes('Gmail'));
 assert.ok(json.terms_text.includes('assistenza@rent-to-a-friend.it'));
 assert.ok(!/<(?:script|h1|p|div)\b/.test(json.terms_text));
 const publish=spawnSync(process.execPath,['scripts/prepare-legal-release.mjs','--publish-sql'],{encoding:'utf8'});
 assert.notEqual(publish.status,0);assert.match(publish.stderr,/informativa privacy/);
});
