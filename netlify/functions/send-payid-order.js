// Netlify Function — handles the "Pay by PayID" path. There's no PayID
// checkout API to call, so instead this: (1) re-validates and re-prices the
// order server-side exactly like the Stripe function does, (2) generates a
// short reference number the customer can quote in their bank transfer,
// and (3) emails you the full order so you can match the incoming payment
// and follow up. The order is NOT confirmed automatically — you confirm it
// once you see the transfer land, the same way you'd handle any manual
// bank-transfer sale.
//
// Setup checklist:
//   - Reuses the RESEND_API_KEY you already set up for the contact form.
//   - Replace TO_EMAIL below if it should go somewhere other than the
//     contact-form inbox.
//   - Until you verify a sending domain in Resend, this can only deliver
//     to the email address your Resend account itself is registered with
//     (see the note in send-contact-email.js) — good enough for testing,
//     but you won't get real order emails until that's set up.
//   - TODO: once a domain is verified, consider also sending the customer
//     a copy of their order + PayID instructions as a confirmation email.

import { products } from '../../src/data/products.js';
import { calculateShipping } from '../../src/data/shipping.js';
import { reserveItems, releaseItems } from './lib/inventory.js';

const TO_EMAIL = 'ed@edweatherheadjewellery.com';
const FROM_EMAIL = 'Ed Weatherhead Jewellery <ed@edweatherheadjewellery.com>';
// Adapts to localhost under `netlify dev` and to the real domain once
// deployed — see the note in create-checkout-session.js.
const ALLOWED_ORIGIN = process.env.URL || 'https://edweatherheadjewellery.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function generateReference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I — avoids look-alike mixups when read aloud or typed
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `EWJ-${code}`;
}

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

  const { items, customer, billing } = data;

  if (!Array.isArray(items) || items.length === 0) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'No items in cart.' }) };
  }

  const requiredFields = ['name', 'email', 'address1', 'suburb', 'state', 'postcode', 'country'];
  const missing = requiredFields.filter((f) => !customer?.[f]);
  if (missing.length > 0) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: `Missing required details: ${missing.join(', ')}` }),
    };
  }

  if (billing) {
    const billingRequired = ['name', 'address1', 'suburb', 'state', 'postcode', 'country'];
    const billingMissing = billingRequired.filter((f) => !billing?.[f]);
    if (billingMissing.length > 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: `Missing required billing details: ${billingMissing.join(', ')}` }),
      };
    }
  }

  // Re-price from real product data, exactly as the Stripe function does —
  // never trust a price sent by the browser.
  const orderLines = [];
  let subtotal = 0;

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
    const price = Number(product.price);
    subtotal += price;
    orderLines.push({ title: product.title, refnumber: product.refnumber, price });
  }

  const shipping = calculateShipping(subtotal);
  const total = subtotal + shipping;
  const reference = generateReference();

  // Reserve every item before sending the order email — this is what stops
  // this same piece being bought via card (or another PayID order) while
  // this one is pending. PayID holds last longer than card holds (there's
  // no automatic payment confirmation to shorten the wait), and are only
  // released manually via products.js or automatically if nothing happens
  // for a few days.
  const refnumbers = orderLines.map((l) => l.refnumber);
  const reservation = await reserveItems(refnumbers, { method: 'payid', reference });

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

  const itemLines = orderLines.map((l) => `  • ${l.title} (#${l.refnumber}) — $${l.price.toFixed(2)} AUD`).join('\n');
  const addressBlock = [
    customer.address1,
    customer.address2,
    `${customer.suburb} ${customer.state} ${customer.postcode}`,
    customer.country,
  ].filter(Boolean).join('\n');

  const billingBlock = billing
    ? [
        billing.name,
        billing.address1,
        billing.address2,
        `${billing.suburb} ${billing.state} ${billing.postcode}`,
        billing.country,
      ].filter(Boolean).join('\n')
    : 'Same as shipping';

  const emailText = `New PayID order — reference ${reference}

Items:
${itemLines}

Subtotal: $${subtotal.toFixed(2)} AUD
Shipping: $${shipping.toFixed(2)} AUD
Total due: $${total.toFixed(2)} AUD

Customer:
${customer.name}
${customer.email}
${customer.phone || '(no phone provided)'}

Shipping address:
${addressBlock}

Billing address:
${billingBlock}

This order is PENDING until you see a PayID transfer of $${total.toFixed(2)} AUD land in your account with reference "${reference}". Once confirmed, mark the piece(s) as sold and arrange shipping with the customer.`;

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        reply_to: customer.email,
        subject: `New PayID order ${reference} — $${total.toFixed(2)} AUD`,
        text: emailText,
      }),
    });

    if (!resendRes.ok) {
      const detail = await resendRes.text();
      await releaseItems(refnumbers); // the order didn't actually go through — don't leave it locked
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Could not send order notification.', detail }),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        reference,
        subtotal,
        shipping,
        total,
        items: orderLines,
      }),
    };
  } catch (err) {
    await releaseItems(refnumbers);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Unexpected server error.' }),
    };
  }
};
