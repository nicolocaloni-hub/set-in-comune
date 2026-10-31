export const publicAssets=['index.html','app.js','api.js','domain.js','marketplace.js','data.js','art.js','photos.js','security.js','style.css','icon.svg','notifications.js','sw.js','manifest.webmanifest','offline.html','icon-192.png','icon-512.png','icon-maskable.png','apple-touch-icon.png'];
export function securityHeaders(backend='') {
  return {
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer',
    'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy':`default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:${backend?' '+backend:''}; connect-src 'self'${backend?' '+backend:''}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`
  };
}
