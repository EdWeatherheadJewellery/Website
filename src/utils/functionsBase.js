// Where the Netlify functions live.
//
// Your site is served from GreenGeeks but the functions run on Netlify, so the
// browser needs the functions' full address. Set VITE_FUNCTIONS_BASE_URL (see
// .env.example) to your Netlify site, e.g. https://your-site.netlify.app.
//
// Leave it unset for local development with `netlify dev`, where the site and
// the functions share one address and relative URLs work.
const BASE = (import.meta.env.VITE_FUNCTIONS_BASE_URL || '').replace(/\/+$/, '');

export const functionUrl = (name) => `${BASE}/.netlify/functions/${name}`;
