// Netlify Function — receives a cart from the frontend, looks up each
// item's real price from src/data/products.js (never trusts a price sent
// by the browser), and creates a Stripe Checkout Session. The frontend
// redirects the customer to the returned URL to pay.
//
// Setup checklist:
//   1. Add the "stripe" package: run `npm install stripe` in the project
//      root (this adds it to package.json/package-lock.json).
//   2. Set STRIPE_SECRET_KEY in this Netlify site's environment variables
//      (use your Stripe *secret* key — starts with sk_test_... while
//      testing, sk_live_... once you're ready to go live). Never put this
//      key in frontend code.
//   3. Update SUCCESS_URL, CANCEL_URL and ALLOWED_ORIGIN below once your
//      site's real domain is live (they're already set to it here).
//   4. Update SHIPPING_COUNTRIES if you ship outside Australia.
//   5. Once deployed, call this function from your cart's checkout button
//      — see the usage note at the bottom of this file.

import Stripe from 'stripe';
import { products } from '../../src/data/products.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const ALLOWED_ORIGIN = 'https://edweatherheadjewellery.com/';
const SUCCESS_URL = 'https://edweatherheadjewellery.com/order-success';
const CANCEL_URL = 'https://edweatherheadjewellery.com/cart';
const SHIPPING_COUNTRIES = ['AU']; // TODO: add more ISO country codes if you ship internationally, e.g. 'NZ', 'US'

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid request body.' }) };
  }

  const { items } = data;

  if (!Array.isArray(items) || items.length === 0) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'No items in cart.' }) };
  }

  // Build Stripe line items from your real product data — the browser
  // only ever sends refnumbers, so a customer can't alter a price in the
  // request and pay less than the real amount.
  const line_items = [];

  for (const item of items) {
    const product = products.find((p) => p.refnumber === item.refnumber);

    if (!product) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: `Unknown item: ${item.refnumber}` }) };
    }
    if (product.archived || product.sold) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: `${product.title} is no longer available.` }),
      };
    }
    if (!product.price) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: `${product.title} is not available for direct purchase.` }),
      };
    }

    const quantity = Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : 1;

    line_items.push({
      quantity,
      price_data: {
        currency: 'aud',
        unit_amount: Math.round(parseFloat(product.price) * 100),
        product_data: {
          name: product.title,
          metadata: { refnumber: product.refnumber },
        },
      },
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: CANCEL_URL,
      shipping_address_collection: { allowed_countries: SHIPPING_COUNTRIES },
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Could not start checkout.', detail: err.message }),
    };
  }
};

// Frontend usage, once deployed — call this from your cart/checkout button:
//
//   const res = await fetch('/.netlify/functions/create-checkout-session', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({
//       items: cart.map(({ refnumber, quantity }) => ({ refnumber, quantity })),
//     }),
//   });
//   const { url, error } = await res.json();
//   if (url) window.location.href = url; // sends the customer to Stripe's hosted checkout page
