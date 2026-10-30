import { mkdir, cp, writeFile, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('src', 'dist', { recursive: true });
const url = process.env.PUBLIC_SUPABASE_URL || '';
const key = process.env.PUBLIC_SUPABASE_ANON_KEY || '';
if (Boolean(url) !== Boolean(key)) throw new Error('Configure both public Supabase variables.');
if (url && new URL(url).protocol !== 'https:') throw new Error('Supabase requires HTTPS.');
if (key.startsWith('sb_secret_')) throw new Error('Use a publishable / anon key, never a secret key.');
if (key.split('.').length === 3) {
  const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
  if (payload.role !== 'anon') throw new Error('Only an anon JWT may be included in the frontend.');
}
await writeFile('dist/config.js', `export default ${JSON.stringify({ url, key })};\n`);
console.log(`Built Set in comune (${url ? 'connected' : 'demo'} mode).`);
