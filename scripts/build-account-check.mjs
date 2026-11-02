// Closed owner-account check, not a marketplace release. Vercel SSO stays enabled.
import {mkdir,copyFile,readFile,writeFile,rm,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {publicAssets,securityHeaders,assertTrackingFree} from './assets.mjs';
import {validatePublicConfig} from '../src/security.js';

if(process.env.VERCEL_ENV!=='preview'||process.env.VERCEL_GIT_COMMIT_REF!=='test/owner-account-check-20261102')throw new Error('Il collaudo account è consentito soltanto nella preview dedicata, mai in produzione.');
const config=validatePublicConfig(process.env.PUBLIC_SUPABASE_URL||'',process.env.PUBLIC_SUPABASE_ANON_KEY||'');
if(config.url!=='https://srjdysdhxnafjrutufmk.supabase.co')throw new Error('Usa soltanto il backend dedicato a RENT TO A FRIEND.');
assertTrackingFree(await Promise.all(publicAssets.filter(f=>/\.(?:js|html)$/.test(f)).map(async name=>({name,text:await readFile('src/'+name,'utf8')}))));
const staging='.account-check-staging';
await rm(staging,{recursive:true,force:true});await mkdir(staging);
for(const name of publicAssets)await copyFile('src/'+name,staging+'/'+name);
await writeFile(staging+'/config.js',`export default ${JSON.stringify({...config,accountCheck:true})};\n`);
await writeFile(staging+'/captcha-config.js','export default {"siteKey":""};\n');
const csp=securityHeaders(config.url,false)['Content-Security-Policy'].replace(/; frame-ancestors 'none'/,'');
const html=await readFile(staging+'/index.html','utf8');
await writeFile(staging+'/index.html',html.replace('<meta name="viewport"',`<meta http-equiv="Content-Security-Policy" content="${csp}">\n  <meta name="viewport"`));
const digest=createHash('sha256').update('owner-account-check');for(const name of publicAssets)digest.update(await readFile('src/'+name));
await writeFile(staging+'/sw.js',(await readFile(staging+'/sw.js','utf8')).replaceAll('__BUILD_REVISION__',digest.digest('hex').slice(0,16)));
await rm('dist',{recursive:true,force:true});await rename(staging,'dist');
console.log('Built closed account check: real backend; existing accounts only; marketplace legal gates unchanged.');
