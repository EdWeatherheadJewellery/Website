// Stripe calls this directly (never your browser) whenever something happens
// on a Checkout Session. This is the other half of create-checkout-session.js:
// that function creates a pending order and holds the pieces; this webhook
// turns the order into a paid one (and the pieces into permanently "sold") once
// Stripe confirms money has changed hands, or frees the hold if the session
// expires unpaid.
//
// The actual database work happens in the PHP API (confirm-paid.php /
// release.php). Both are safe to call repeatedly, which matters because Stripe
// re-delivers events whenever it doesn't get a 2xx answer.
//
// Setup checklist:
//   1. In Stripe (Workbench -> Event destinations, or Developers -> Webhooks),
//      add an endpoint pointing at:
//        <your site>/.netlify/functions/stripe-webhook
//      and select these events:
//        checkout.session.completed
//        checkout.session.async_payment_succeeded   (only matters for delayed payment methods)
//        checkout.session.expired                   (optional: tidies up abandoned checkouts)
//   2. Stripe shows a signing secret (whsec_...) — set it as STRIPE_WEBHOOK_SECRET
//      in Netlify's environment variables. It's separate from STRIPE_SECRET_KEY.
//   3. Local testing: `stripe listen --forward-to localhost:8888/.netlify/functions/stripe-webhook`
//      prints its own temporary whsec_... secret to use while testing locally.
//   4. Test and live mode each need their own endpoint and secret in Stripe.
//   5. API_BASE_URL and API_SECRET must be set too (see lib/api.js).

import Stripe from 'stripe';
import { callApi } from './lib/api.js';
import { sendOwnerEmail } from './lib/email.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// The order id we stamped into the session's metadata when we created it. Lets
// the API still find the order if recording the Stripe session id ever failed.
function orderIdFromMetadata(session) {
  const id = Number.parseInt(session.metadata?.order_id ?? '', 10);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

// Pulls what the owner needs (who to ship to) out of the Stripe session. The
// shipping details moved to `collected_information` in newer Stripe API
// versions, so look in both places.
function detailsFromSession(session) {
  const customer = session.customer_details || {};
  const shipping = session.collected_information?.shipping_details ?? session.shipping_details ?? null;
  const toAddress = (a) => ({
    address1: a?.line1,
    address2: a?.line2,
    suburb: a?.city,
    state: a?.state,
    postcode: a?.postal_code,
    country: a?.country,
  });
  return {
    customer_name: customer.name,
    customer_email: customer.email,
    customer_phone: customer.phone,
    ship_name: shipping?.name,
    ship: shipping?.address ? toAddress(shipping.address) : null,
    billing: customer.address ? { name: customer.name, ...toAddress(customer.address) } : null,
    amount_total_cents: Number.isInteger(session.amount_total) ? session.amount_total : null,
  };
}

async function handlePaid(session) {
  const result = await callApi('confirm-paid.php', {
    stripe_session_id: session.id,
    order_id: orderIdFromMetadata(session),
    details: detailsFromSession(session),
  });

  if (result.status === 404) {
    // A payment for a session we have no order for (e.g. created outside this
    // site). Retrying will never help, so log it and acknowledge.
    console.error('Paid Stripe session has no matching order:', session.id);
    return;
  }
  if (result.status !== 200 || !result.data?.ok) {
    // Our side failed (API down, database error...). Throwing makes us answer
    // with a 5xx so Stripe retries later.
    throw new Error(`confirm-paid.php returned ${result.status}`);
  }

  const { order, conflicts } = result.data;
  if (conflicts?.length) {
    // The customer has paid, but a piece was sold (or is being bought) elsewhere —
    // this needs a human, so tell the owner straight away.
    const list = conflicts
      .map((c) => `  • ${c.title} (#${c.refnumber}) — ${c.reason === 'already_sold' ? 'already sold to someone else' : 'currently held by another customer'}`)
      .join('\n');
    const email = await sendOwnerEmail({
      subject: `ACTION NEEDED: order ${order.reference} paid, but a piece is unavailable`,
      text: `Order ${order.reference} was paid by card, but:\n\n${list}\n\nThe order is recorded as paid in your database with a CONFLICT note. Please contact the customer and either refund the affected item(s) in Stripe or sort it out another way.\n\nStripe session: ${session.id}`,
    }).catch((err) => ({ ok: false, detail: String(err) }));
    if (!email.ok) console.error('Could not send conflict alert for', order.reference, email.detail);
  }
}

async function handleExpired(session) {
  const result = await callApi('release.php', {
    stripe_session_id: session.id,
    order_id: orderIdFromMetadata(session),
    status: 'expired',
  });
  if (result.status !== 200 && result.status !== 404) {
    throw new Error(`release.php returned ${result.status}`);
  }
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const signature = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    // Verifying against the RAW body (not JSON.parse'd) is what proves this
    // request genuinely came from Stripe and wasn't forged — never skip it.
    stripeEvent = stripe.webhooks.constructEvent(event.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return { statusCode: 400, body: `Webhook signature verification failed: ${err.message}` };
  }

  try {
    const session = stripeEvent.data.object;

    if (stripeEvent.type === 'checkout.session.completed' || stripeEvent.type === 'checkout.session.async_payment_succeeded') {
      // Some payment methods confirm slightly later — only treat it as sold
      // once Stripe itself says it's paid.
      if (session.payment_status === 'paid') {
        await handlePaid(session);
      }
    } else if (stripeEvent.type === 'checkout.session.expired') {
      await handleExpired(session);
    }
  } catch (err) {
    console.error('Webhook processing failed for event', stripeEvent.id, err);
    return { statusCode: 500, body: 'Processing failed; please retry.' };
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
