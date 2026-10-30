export const publicAssets=['index.html','app.js','api.js','domain.js','data.js','art.js','photos.js','security.js','style.css','icon.svg'];
export function securityHeaders(backend='') {
  return {
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer',
    'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy':`default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:${backend?' '+backend:''}; connect-src 'self'${backend?' '+backend:''}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`
  };
}
