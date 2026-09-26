// Stripe calls this directly (never your browser), whenever something
// happens on a Checkout Session — we only care about "payment succeeded".
// This is the other half of the reservation system in lib/inventory.js:
// create-checkout-session.js puts a temporary hold on each item before
// Stripe ever takes payment; this webhook is what turns that hold into a
// permanent "sold" record once money has actually changed hands. Without
// it, a paid-for item would eventually become available again when its
// hold expires.
//
// Setup checklist:
//   1. In Stripe (Workbench → Event destinations, or Developers → Webhooks
//      in the classic dashboard), add an endpoint pointing at:
//        <your site>/.netlify/functions/stripe-webhook
//      and select the "checkout.session.completed" event.
//   2. Stripe will show you a signing secret (starts with whsec_...) —
//      set that as STRIPE_WEBHOOK_SECRET in Netlify's environment
//      variables. This is a separate secret from STRIPE_SECRET_KEY.
//   3. For local testing, use the Stripe CLI: `stripe listen --forward-to
//      localhost:8888/.netlify/functions/stripe-webhook` — it prints its
//      own temporary whsec_... secret to use while testing locally.
//   4. Test and live mode each need their own webhook endpoint and secret
//      in Stripe — remember to set this up again when you switch to your
//      live key.

import Stripe from 'stripe';
import { confirmSold } from './lib/inventory.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const signature = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    // Verifying against the RAW body (not JSON.parse'd) is what proves
    // this request genuinely came from Stripe and wasn't forged — never
    // skip this check, even though it means handling the body differently
    // to every other function in this project.
    stripeEvent = stripe.webhooks.constructEvent(event.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return { statusCode: 400, body: `Webhook signature verification failed: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;

    // For one-time payments this is almost always already 'paid' by the
    // time this event fires, but some payment methods confirm slightly
    // later — only treat it as sold once Stripe itself says it's paid.
    if (session.payment_status === 'paid' && session.metadata?.refnumbers) {
      try {
        const refnumbers = JSON.parse(session.metadata.refnumbers);
        await confirmSold(refnumbers);
      } catch (err) {
        // Something is wrong with our own metadata, not with Stripe — log
        // it, but still acknowledge the event so Stripe doesn't keep
        // retrying a delivery that will never parse correctly.
        console.error('Failed to confirm sold items for session', session.id, err);
      }
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
