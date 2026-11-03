export const publicAssets=['index.html','app.js','api.js','auth-config.js','hosting-config.js','captcha.js','captcha-config.js','domain.js','marketplace.js','privacy.js','legal-documents.js','form-hints.js','intro.js','intro.mp4','intro-poster.webp','browser-storage.js','retention.js','service-policy.js','data.js','art.js','photos.js','security.js','style.css','logo-mark.webp','notifications.js','sw.js','manifest.webmanifest','offline.html','icon-192.png','icon-512.png','icon-maskable.png','apple-touch-icon.png'];

// This release has no consent manager: known trackers and external executable
// embeds must not silently enter the build. This is a bounded source check,
// not a general-purpose runtime tracker detector or legal certification.
export function assertTrackingFree(sources){
 const tracker=/(?:googletagmanager\.com|google-analytics\.com|googlesyndication\.com|doubleclick\.net|googleadservices\.com|fundingchoicesmessages\.google\.com|connect\.facebook\.net|static\.hotjar\.com|clarity\.ms|@vercel\/(?:analytics|speed-insights)|\/_vercel\/(?:insights|speed-insights)\/)|\b(?:gtag|fbq|hj|clarity)\s*\(|\b(?:adsbygoogle|googletag)\s*(?:\.|\[)/i;
 for(const {name,text} of sources){
  const externalEmbed=/<(?:script|iframe)\b[^>]*\bsrc\s*=\s*["']\s*(?:https?:)?\/\//i;
  const externalImport=/\b(?:import|export)\s+(?:[^;\n]*?\sfrom\s*)?["'](?:https?:)?\/\//i;
  const dynamicImport=/\bimport\s*\(\s*["'](?:https?:)?\/\//i;
  if(tracker.test(text)||externalEmbed.test(text)||externalImport.test(text)||dynamicImport.test(text))throw new Error(`Revisione privacy richiesta: tracker o codice esterno in ${name}. Questa versione non attiva tracciamento facoltativo.`);
 }
}
export function securityHeaders(backend='',captchaEnabled=false) {
  return {
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer',
    'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy':`default-src 'self'; script-src 'self'${captchaEnabled?' https://challenges.cloudflare.com':''};${captchaEnabled?' frame-src https://challenges.cloudflare.com;':''} style-src 'self'; media-src 'self'; img-src 'self' data: blob:${backend?' '+backend:''}; connect-src 'self'${backend?' '+backend:''}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`
  };
}
