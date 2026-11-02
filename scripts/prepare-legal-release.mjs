import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {privacyMarkup,termsMarkup,assertPrivacyReady} from '../src/privacy.js';
import {legalRelease} from '../src/service-policy.js';

export function documentText(markup){
 return markup.replace(/<a\b[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gs,(_m,url,label)=>`${label} (${url.startsWith('#')?'https://rent-to-a-friend.it/'+url:url})`)
 .replace(/<li\b[^>]*>/g,'\n• ').replace(/<tr\b[^>]*>/g,'\n').replace(/<\/(?:td|th)>/g,' | ')
 .replace(/<\/?(?:h[1-6]|p|ul|ol|div|details|summary|table|thead|tbody)\b[^>]*>/g,'\n')
 .replace(/<[^>]*>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&')
 .split('\n').map(l=>l.trim()).filter(Boolean).join('\n\n')+'\n';
}
const publishing=process.argv.includes('--publish-sql');
if(publishing){assertPrivacyReady();if(!legalRelease.approved)throw new Error('I documenti sono una proposta: pubblicazione non abilitata.');}
const terms_text=documentText(termsMarkup(false)),privacy_text=documentText(privacyMarkup(false));
const hash=text=>createHash('sha256').update(text,'utf8').digest('hex');
const release={version:legalRelease.version,status:publishing?'reviewed-candidate':'proposal-not-published',terms_hash:hash(terms_text),privacy_hash:hash(privacy_text),terms_text,privacy_text};
await mkdir('legal-review',{recursive:true});
await writeFile('legal-review/release-candidate.json',JSON.stringify(release,null,2)+'\n');
await writeFile('legal-review/condizioni.txt',terms_text);await writeFile('legal-review/privacy.txt',privacy_text);
if(publishing){
 // UTF-8 hex literals avoid SQL quoting issues. This file must still be reviewed
 // and applied by the release operator; the generator never connects to a DB.
 const literal=text=>`convert_from(decode('${Buffer.from(text,'utf8').toString('hex')}','hex'),'UTF8')`;
 const sql=`begin;\nupdate private.legal_releases set active=false where active;\ninsert into private.legal_releases(version,terms_text,privacy_text,published_at,active) values(${literal(release.version)},${literal(terms_text)},${literal(privacy_text)},now(),true);\ncommit;\n`;
 await writeFile('legal-review/publish-reviewed-release.sql',sql);
}
console.log(JSON.stringify({version:release.version,status:release.status,terms_hash:release.terms_hash,privacy_hash:release.privacy_hash,publishing_sql_generated:publishing}));
