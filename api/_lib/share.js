// Share previews for listings. Social apps (WhatsApp, Instagram, Telegram...)
// read Open Graph tags from static HTML: they never run the app's JavaScript and
// never see the #fragment. /a/<id> therefore returns a tiny page with the
// listing's public data only, and sends people straight on to the app.
export const SITE_NAME = 'RENT TO A FRIEND';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isListingId = id => typeof id === 'string' && UUID.test(id);

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const euro = value => {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(n);
};

// Only public listing photos from the configured Supabase project.
export function safeImage(url, supabaseUrl) {
  try {
    const image = new URL(url), base = new URL(supabaseUrl);
    return image.protocol === 'https:' && image.host === base.host && image.pathname.startsWith('/storage/v1/object/public/listing-photos/') ? image.href : null;
  } catch { return null; }
}

export function sharePage({ listing, origin, id, supabaseUrl }) {
  const available = Boolean(listing && listing.active && !listing.archived);
  const shareUrl = `${origin}/a/${isListingId(id) ? id : ''}`;
  const target = available ? `${origin}/#search?listing=${id}` : `${origin}/#search`;
  const title = available ? `${listing.title} · ${euro(listing.price)}/giorno` : 'Annuncio non disponibile';
  const description = available
    ? `A noleggio a ${listing.zone}, Roma, da ${listing.owner_name || 'un filmmaker'}. Attrezzatura audiovisiva tra privati su ${SITE_NAME}.`
    : `Questo annuncio non è più disponibile. Cerca altra attrezzatura a noleggio a Roma su ${SITE_NAME}.`;
  const image = (available && safeImage(listing.images?.[0], supabaseUrl)) || `${origin}/icon-512.png`;
  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · ${SITE_NAME}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${available ? 'index,follow' : 'noindex'}">
<link rel="canonical" href="${esc(shareUrl)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="${SITE_NAME}"><meta property="og:locale" content="it_IT">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}"><meta property="og:url" content="${esc(shareUrl)}">
<meta name="twitter:card" content="${image.endsWith('/icon-512.png') ? 'summary' : 'summary_large_image'}">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
</head><body><p><a href="${esc(target)}">${available ? `Apri l’annuncio su ${SITE_NAME}` : `Cerca attrezzatura su ${SITE_NAME}`}</a></p></body></html>`;
}

// Reads one listing with the public anon key: RLS only returns active listings
// of open accounts, and only the columns granted to anonymous visitors.
export async function loadListing(id, { supabaseUrl, anonKey, fetchImpl = fetch }) {
  if (!isListingId(id) || !supabaseUrl || !anonKey) return null;
  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/listings?id=eq.${id}&select=id,title,price,zone,images,active,archived,owner_name&limit=1`;
  const response = await fetchImpl(url, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, Accept: 'application/json' }, signal: AbortSignal.timeout(4000), redirect: 'error' });
  if (!response.ok) return null;
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] || null : null;
}
