import {readFile,writeFile} from 'node:fs/promises';
import {securityHeaders} from './assets.mjs';

// Run the same guarded build used by Vercel. No provider SDK or install is needed.
await import('./build.mjs');
// The privacy notice must describe the provider serving this artifact.
await writeFile('dist/hosting-config.js',"export default 'Cloudflare Pages';\n");
const config=JSON.parse((await readFile('dist/config.js','utf8')).replace(/^export default /,'').trim().replace(/;$/,''));
const captcha=JSON.parse((await readFile('dist/captcha-config.js','utf8')).replace(/^export default /,'').trim().replace(/;$/,''));
const headers={
  ...securityHeaders(config.url,Boolean(config.url&&captcha.siteKey)),
  'Strict-Transport-Security':'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options':'DENY',
  'Cross-Origin-Opener-Policy':'same-origin',
  'Cache-Control':'no-cache'
};
const block=(path,values)=>path+'\n'+Object.entries(values).map(([key,value])=>`  ${key}: ${value}`).join('\n');
await writeFile('dist/_headers',[
  block('/*',headers),
  block('/sw.js',{'Cache-Control':'no-cache, no-store, must-revalidate','Service-Worker-Allowed':'/'}),
  block('/manifest.webmanifest',{'Content-Type':'application/manifest+json'})
].join('\n\n')+'\n');
console.log('Prepared Cloudflare Pages static headers. No deployment or DNS change performed.');
