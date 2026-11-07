// Vercel Function behind /a/<id> (see the rewrite in vercel.json).
// Public data only: it uses the publishable anon key, never service_role.
import { isListingId, loadListing, sharePage } from './_lib/share.js';

const ORIGIN = (process.env.PUBLIC_SITE_URL || 'https://rent-to-a-friend.it').replace(/\/$/, '');

export default async function handler(req, res) {
  const raw = String(req.query?.id || '');
  const id = isListingId(raw) ? raw.toLowerCase() : '';
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || '';
  let listing = null;
  try {
    listing = id ? await loadListing(id, { supabaseUrl, anonKey: process.env.PUBLIC_SUPABASE_ANON_KEY }) : null;
  } catch { listing = null; }
  const available = Boolean(listing && listing.active && !listing.archived);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', available ? 'public, max-age=0, s-maxage=300, stale-while-revalidate=600' : 'public, max-age=0, s-maxage=60');
  res.status(available ? 200 : 404).send(sharePage({ listing, origin: ORIGIN, id, supabaseUrl }));
}
