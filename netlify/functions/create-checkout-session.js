// Netlify Function — receives a cart from the frontend and starts a Stripe
// Checkout Session. The browser only ever sends refnumbers: prices, titles and
// availability all come from the database via the PHP API, so a customer can't
// alter a price (or buy something that's already gone) by editing the request.
//
// Flow:
//   1. reserve.php  — atomically creates a pending order and holds every item
//                     (all-or-nothing). Fails if any piece is sold or held by
//                     someone else. If the same customer is retrying (e.g. they
//                     pressed Stripe's "back" link) their own hold is reclaimed
//                     and their previous Stripe session is handed back to us.
//   2. Expire that earlier Stripe session so it can't be paid by mistake.
//   3. Create the new Stripe session.
//   4. attach.php   — record shipping, total and the Stripe session id.
//
// stripe-webhook.js turns the pending order into a paid one when Stripe confirms.
//
// Setup checklist:
//   - STRIPE_SECRET_KEY, API_BASE_URL and API_SECRET set in Netlify's
//     environment variables (see lib/api.js).
//   - SITE_URL set to your real site (https://edweatherheadjewellery.com). Stripe
//     sends customers back there, and only that origin may call this function
//     (see lib/cors.js). Leave it unset under `netlify dev`.
//   - Update SHIPPING_COUNTRIES (src/data/shipping.js) if you ship outside Australia.

import Stripe from 'stripe';
import { SHIPPING_COUNTRIES, calculateShipping } from '../../src/data/shipping.js';
import { callApi, describeReservationFailure, releaseOrder, resolveHolderId } from './lib/api.js';
import { corsHeadersFor, siteUrl } from './lib/cors.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const handler = async (event) => {
  const corsHeaders = corsHeadersFor(event);
  const reply = (statusCode, body) => ({ statusCode, headers: corsHeaders, body: JSON.stringify(body) });

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
    return reply(400, { error: 'Invalid request body.' });
  }

  const { items, cartSessionId } = data;

  if (!Array.isArray(items) || items.length === 0) {
    return reply(400, { error: 'No items in cart.' });
  }
  if (!items.every((item) => typeof item?.refnumber === 'string')) {
    return reply(400, { error: 'Invalid item in cart.' });
  }

  // 1. Create the pending order and hold every item.
  let reservation;
  try {
    reservation = await callApi('reserve.php', {
      items: items.map((item) => ({ refnumber: item.refnumber })),
      holder_id: resolveHolderId(cartSessionId),
      method: 'card',
    });
  } catch (err) {
    console.error('reserve.php failed', err);
    return reply(500, { error: 'Could not check item availability.' });
  }

  if (reservation.status !== 200 || !reservation.data?.ok) {
    const { statusCode, error } = describeReservationFailure(reservation.data);
    if (statusCode >= 500) console.error('reserve.php returned', reservation.status, reservation.data);
    return reply(statusCode, { error });
  }

  const { order, items: lines, expire_stripe_sessions: staleSessions = [] } = reservation.data;

  // Shipping is calculated from the real (database-priced) subtotal, not
  // anything sent by the browser. Everything below is in whole cents.
  const subtotalCents = order.subtotal_cents;
  const shippingCents = Math.round(calculateShipping(subtotalCents / 100) * 100);

  // 2. This customer's earlier, abandoned Stripe session(s) must not stay payable.
  //    (If one was somehow already paid, Stripe refuses and we carry on — the
  //    webhook copes with that case.)
  await Promise.allSettled(staleSessions.map((id) => stripe.checkout.sessions.expire(id)));

  // 3. Create the Stripe session.
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lines.map((line) => ({
        quantity: 1,
        price_data: {
          currency: 'aud',
          unit_amount: line.unit_price_cents,
          product_data: { name: line.title, metadata: { refnumber: line.refnumber } },
        },
      })),
      success_url: `${siteUrl()}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/cart`,
      client_reference_id: order.reference,
      metadata: { order_id: String(order.id), reference: order.reference }, // read back by stripe-webhook.js
      shipping_address_collection: { allowed_countries: SHIPPING_COUNTRIES },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: shippingCents, currency: 'aud' },
            display_name: shippingCents === 0 ? 'Free shipping' : 'Flat rate shipping',
          },
        },
      ],
    });
  } catch (err) {
    // The hold worked but Stripe itself failed — free the items now rather
    // than leaving them locked for nothing until the hold times out.
    console.error('Stripe session creation failed', err);
    await releaseOrder(order.id);
    return reply(500, { error: 'Could not start checkout.' });
  }

  // 4. Record the final amounts and the Stripe session id on the order.
  try {
    const attached = await callApi('attach.php', {
      order_id: order.id,
      shipping_cents: shippingCents,
      total_cents: subtotalCents + shippingCents,
      stripe_session_id: session.id,
    });
    if (attached.status !== 200 || !attached.data?.ok) {
      throw new Error(`attach.php returned ${attached.status}`);
    }
  } catch (err) {
    // Without this link the order can't be matched to the payment — don't
    // hand the customer a payable session we can't track.
    console.error('attach.php failed', err);
    await Promise.allSettled([stripe.checkout.sessions.expire(session.id)]);
    await releaseOrder(order.id);
    return reply(500, { error: 'Could not start checkout.' });
  }

  return reply(200, { url: session.url });
};

// Frontend usage (see src/pages/Checkout.jsx):
//
//   const res = await fetch('/.netlify/functions/create-checkout-session', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ items: [{ refnumber }], cartSessionId }),
//   });
//   const { url, error } = await res.json();
//   if (url) window.location.href = url; // sends the customer to Stripe's hosted checkout page
