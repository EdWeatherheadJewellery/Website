// Where your site lives vs. where these functions run.
//
// Your React site is served from GreenGeeks; these functions run on Netlify at
// a different address (https://<something>.netlify.app). So:
//   - the browser calls the functions cross-origin, which needs CORS headers
//     naming your real site (not Netlify's address), and
//   - Stripe must send customers back to your real site after checkout.
//
// Environment variables (Netlify -> Site configuration -> Environment variables):
//   SITE_URL         your real site, e.g. https://edweatherheadjewellery.com
//                    (leave unset under `netlify dev`: it then uses localhost)
//   ALLOWED_ORIGINS  optional, comma-separated extra origins allowed to call
//                    these functions, e.g. https://www.edweatherheadjewellery.com

export function siteUrl() {
  return (process.env.SITE_URL || process.env.URL || 'https://edweatherheadjewellery.com').replace(/\/+$/, '');
}

function allowedOrigins() {
  const extra = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return [...new Set([siteUrl(), ...extra])];
}

// Browsers send the Origin header without a trailing slash, and it must match
// Access-Control-Allow-Origin exactly — so we echo it back only when it's one
// of ours, and otherwise answer with the main site (which the browser then rejects).
export function corsHeadersFor(event, methods = 'POST, OPTIONS') {
  const origin = event.headers?.origin || event.headers?.Origin;
  const allowed = allowedOrigins();
  return {
    'Access-Control-Allow-Origin': origin && allowed.includes(origin) ? origin : allowed[0],
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': methods,
    Vary: 'Origin',
  };
}
