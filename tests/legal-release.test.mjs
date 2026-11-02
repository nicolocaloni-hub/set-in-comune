import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFile,mkdtemp,cp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';

test('approved publication preserves exact UTF-8 hashes and still refuses an unapproved copy',async t=>{
 const candidate=spawnSync(process.execPath,['scripts/prepare-legal-release.mjs'],{encoding:'utf8'});assert.equal(candidate.status,0,candidate.stderr);
 const json=JSON.parse(await readFile(new URL('../legal-review/release-candidate.json',import.meta.url),'utf8'));
 assert.equal(json.status,'approved-snapshot');
 for(const [type,file] of [['terms','condizioni.txt'],['privacy','privacy.txt']]){
  const text=await readFile(new URL('../legal-review/'+file,import.meta.url),'utf8');
  assert.equal(text,json[type+'_text']);assert.equal(createHash('sha256').update(text,'utf8').digest('hex'),json[type+'_hash']);
 }
 assert.ok(json.terms_text.includes('https://rent-to-a-friend.it/#privacy'));
 assert.ok(json.privacy_text.includes('IONOS'));assert.ok(json.privacy_text.includes('Gmail'));
 assert.ok(json.terms_text.includes('assistenza@rent-to-a-friend.it'));
 assert.ok(!/<(?:script|h1|p|div)\b/.test(json.terms_text));
 const publish=spawnSync(process.execPath,['scripts/prepare-legal-release.mjs','--publish-sql'],{encoding:'utf8'});
 assert.equal(publish.status,0,publish.stderr);
 const approved=JSON.parse(await readFile(new URL('../legal-review/release-candidate.json',import.meta.url),'utf8'));
 assert.equal(approved.status,'approved-for-publication');assert.equal(approved.terms_hash,json.terms_hash);assert.equal(approved.privacy_hash,json.privacy_hash);
 const sql=await readFile(new URL('../legal-review/publish-reviewed-release.sql',import.meta.url),'utf8');
 assert.ok(sql.startsWith('begin;'));assert.ok(sql.includes('insert into private.legal_releases'));assert.ok(!sql.includes('insert into private.legal_receipts'));
 const dir=await mkdtemp(join(tmpdir(),'rtaf-unapproved-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 for(const path of ['src','scripts'])await cp(new URL('../'+path,import.meta.url),join(dir,path),{recursive:true});
 await writeFile(join(dir,'package.json'),'{"type":"module"}');
 const privacy=join(dir,'src/privacy.js');await writeFile(privacy,(await readFile(privacy,'utf8'))+'\nprivacySettings.publicationApproved=false;\n');
 const rejected=spawnSync(process.execPath,['scripts/prepare-legal-release.mjs','--publish-sql'],{cwd:dir,encoding:'utf8'});
 assert.notEqual(rejected.status,0);assert.match(rejected.stderr,/informativa privacy/);
});
