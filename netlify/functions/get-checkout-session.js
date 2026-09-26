// Netlify Function — looks up a Stripe Checkout Session by ID so the order
// confirmation page can show real, server-verified order details instead of
// just trusting the URL. Only returns data once Stripe confirms the payment
// actually succeeded, so someone can't view a "confirmed" order by guessing
// or reusing a cancelled session's URL.

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
// Adapts to localhost under `netlify dev` and to the real domain once
// deployed — see the note in create-checkout-session.js.
const ALLOWED_ORIGIN = process.env.URL || 'https://edweatherheadjewellery.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
  }

  const sessionId = event.queryStringParameters?.session_id;
  if (!sessionId) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing session_id.' }) };
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items'],
    });

    if (session.payment_status !== 'paid') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ paid: false }),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        paid: true,
        amountTotal: session.amount_total / 100,
        currency: session.currency,
        customerEmail: session.customer_details?.email || null,
        shippingAddress: session.shipping_details?.address || null,
        lineItems: session.line_items.data.map((li) => ({
          name: li.description,
          quantity: li.quantity,
          amount: li.amount_total / 100,
        })),
      }),
    };
  } catch (err) {
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Order not found.' }),
    };
  }
};
