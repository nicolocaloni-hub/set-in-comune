import {mkdir,copyFile,readFile,writeFile,rm,rename} from 'node:fs/promises';
import {assertPrivacyReady} from '../src/privacy.js';
import {validatePublicConfig} from '../src/security.js';
import {validateCaptchaSiteKey} from '../src/captcha.js';
import {createHash} from 'node:crypto';
import {publicAssets,securityHeaders,assertTrackingFree} from './assets.mjs';
// Validate before writing: no arbitrary env value may reach the public artifact.
const config=validatePublicConfig(process.env.PUBLIC_SUPABASE_URL||'',process.env.PUBLIC_SUPABASE_ANON_KEY||'');
const siteKey=validateCaptchaSiteKey(process.env.PUBLIC_TURNSTILE_SITE_KEY||'');
if(config.url){assertPrivacyReady();if(!siteKey)throw new Error('Configura PUBLIC_TURNSTILE_SITE_KEY prima di collegare gli account.');}
assertTrackingFree(await Promise.all(publicAssets.filter(f=>/\.(?:js|html)$/.test(f)).map(async name=>({name,text:await readFile('src/'+name,'utf8')}))));
const staging='.build-staging';
await rm(staging,{recursive:true,force:true});
await mkdir(staging);
for(const file of publicAssets)await copyFile('src/'+file,staging+'/'+file);
await writeFile(staging+'/config.js',`export default ${JSON.stringify(config)};\n`);
await writeFile(staging+'/captcha-config.js',`export default ${JSON.stringify({siteKey:config.url?siteKey:''})};\n`);
const csp=securityHeaders(config.url,Boolean(config.url&&siteKey))['Content-Security-Policy'].replace(/; frame-ancestors 'none'/,'');
const html=await readFile(staging+'/index.html','utf8');
await writeFile(staging+'/index.html',html.replace('<meta name="viewport"',`<meta http-equiv="Content-Security-Policy" content="${csp}">\n  <meta name="viewport"`));
const digest=createHash('sha256').update(html+csp+siteKey);for(const asset of publicAssets)digest.update(await readFile('src/'+asset));const revision=digest.digest('hex').slice(0,16);
await writeFile(staging+'/sw.js',(await readFile('src/sw.js','utf8')).replaceAll('__BUILD_REVISION__',revision));
await rm('dist',{recursive:true,force:true});
await rename(staging,'dist');
console.log(`Built RENT TO A FRIEND (${config.url?'connected':'demo'} mode).`);
