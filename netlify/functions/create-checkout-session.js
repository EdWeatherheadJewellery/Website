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
//   3. SUCCESS_URL, CANCEL_URL and ALLOWED_ORIGIN below are derived
//      automatically from Netlify's process.env.URL — no need to edit them
//      for local dev vs. production, they just adapt.
//   4. Update SHIPPING_COUNTRIES if you ship outside Australia.
//   5. Once deployed, call this function from your cart's checkout button
//      — see the usage note at the bottom of this file.

import Stripe from 'stripe';
import { products } from '../../src/data/products.js';
import { SHIPPING_COUNTRIES, calculateShipping } from '../../src/data/shipping.js';
import { reserveItems, releaseItems } from './lib/inventory.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Netlify sets process.env.URL to whatever the current context actually is:
// http://localhost:8888 under `netlify dev`, or your real domain once
// deployed — so these adapt automatically instead of always pointing at
// production. Falls back to the live domain if that variable is ever unset.
const SITE_URL = process.env.URL || 'https://edweatherheadjewellery.com';
const ALLOWED_ORIGIN = SITE_URL;
const SUCCESS_URL = `${SITE_URL}/order-success`;
const CANCEL_URL = `${SITE_URL}/cart`;

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

  // Reserve every item before we let Stripe take payment — this is what
  // actually stops two customers both successfully paying for the same
  // one-of-a-kind piece. If anything in the cart is already held by
  // another in-progress or completed purchase, nothing is charged.
  const refnumbers = line_items.map((li) => li.price_data.product_data.metadata.refnumber);
  const reservation = await reserveItems(refnumbers, { method: 'card' });

  if (!reservation.ok) {
    const unavailableProduct = products.find((p) => p.refnumber === reservation.unavailable);
    return {
      statusCode: 409,
      headers: corsHeaders,
      body: JSON.stringify({
        error: `${unavailableProduct?.title || 'One of these items'} was just purchased by someone else. Please remove it from your cart and try again.`,
      }),
    };
  }

  // Shipping is calculated from the real (server-priced) subtotal, not
  // anything sent by the browser.
  const subtotal = line_items.reduce((sum, li) => sum + (li.price_data.unit_amount / 100) * li.quantity, 0);
  const shippingAmount = calculateShipping(subtotal);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: CANCEL_URL,
      metadata: { refnumbers: JSON.stringify(refnumbers) }, // read back by stripe-webhook.js once payment succeeds
      shipping_address_collection: { allowed_countries: SHIPPING_COUNTRIES },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: Math.round(shippingAmount * 100), currency: 'aud' },
            display_name: shippingAmount === 0 ? 'Free shipping' : 'Flat rate shipping',
          },
        },
      ],
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    // The reservation succeeded but Stripe itself failed — release the
    // hold rather than leaving it locked for nothing until it expires.
    await releaseItems(refnumbers);
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
