// Netlify Function — handles the "Pay by PayID" path. There's no PayID
// checkout API to call, so instead this: (1) re-validates and re-prices the
// order server-side exactly like the Stripe function does, (2) generates a
// short reference number the customer can quote in their bank transfer,
// and (3) emails you the full order so you can match the incoming payment
// and follow up. The order is NOT confirmed automatically — you confirm it
// once you see the transfer land, the same way you'd handle any manual
// bank-transfer sale.
//
// Availability and prices come from the database via the PHP API (reserve.php),
// exactly like the card checkout, except that a PayID order marks the piece(s) as
// SOLD straight away (a bank transfer can't confirm itself). Unpaid orders are
// released automatically after 3 days, or by cancelling from the signed
// "manage this order" link in the order email. Opening it shows the
// order with a "Payment received - mark as sold" button (and a way to cancel
// and put the piece(s) back on sale if the customer never pays).
//
// Setup checklist:
//   - Reuses the RESEND_API_KEY you already set up for the contact form.
//   - The owner address is set in lib/email.js.
//   - API_BASE_URL and API_SECRET must be set (see lib/api.js).
//   - Until you verify a sending domain in Resend, this can only deliver
//     to the email address your Resend account itself is registered with
//     (see the note in send-contact-email.js) — good enough for testing,
//     but you won't get real order emails until that's set up.
//   - The customer's own email (order + how to pay by PayID) is sent by the PHP API,
//     via notify.php, once your order notification above has gone out. All the
//     customer emails (card confirmation, PayID instructions, auto-cancelled,
//     payment received) are built in api/lib/mail.php and need `resend_api_key`
//     in the PHP config file.

import { calculateShipping } from '../../src/data/shipping.js';
import { callApi, describeReservationFailure, releaseOrder, resolveHolderId } from './lib/api.js';
import { sendOwnerEmail } from './lib/email.js';
import { corsHeadersFor } from './lib/cors.js';

export const handler = async (event) => {
  const corsHeaders = corsHeadersFor(event);

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

  const { items, customer, billing, cartSessionId } = data;

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

  if (!items.every((item) => typeof item?.refnumber === 'string')) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid item in cart.' }) };
  }

  // Create the pending order and mark every piece sold. Prices, titles and
  // availability come from the database, never from the browser. Marking the
  // piece sold is what stops it being bought by card (or another PayID order)
  // while this one waits for payment; cancelling the order puts it back on sale.
  let reservation;
  try {
    reservation = await callApi('reserve.php', {
      items: items.map((item) => ({ refnumber: item.refnumber })),
      holder_id: resolveHolderId(cartSessionId),
      method: 'payid',
      customer,
      billing: billing || null,
    });
  } catch (err) {
    console.error('reserve.php failed', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Could not check item availability.' }),
    };
  }

  if (reservation.status !== 200 || !reservation.data?.ok) {
    const { statusCode, error } = describeReservationFailure(reservation.data);
    if (statusCode >= 500) console.error('reserve.php returned', reservation.status, reservation.data);
    return { statusCode, headers: corsHeaders, body: JSON.stringify({ error }) };
  }

  const { order, items: lines, manage_url: manageUrl } = reservation.data;
  const reference = order.reference;
  const orderLines = lines.map((l) => ({ title: l.title, refnumber: l.refnumber, price: l.unit_price_cents / 100 }));

  const subtotalCents = order.subtotal_cents;
  const shippingCents = Math.round(calculateShipping(subtotalCents / 100) * 100);
  const subtotal = subtotalCents / 100;
  const shipping = shippingCents / 100;
  const total = (subtotalCents + shippingCents) / 100;

  try {
    const attached = await callApi('attach.php', {
      order_id: order.id,
      shipping_cents: shippingCents,
      total_cents: subtotalCents + shippingCents,
    });
    if (attached.status !== 200 || !attached.data?.ok) {
      throw new Error(`attach.php returned ${attached.status}`);
    }
  } catch (err) {
    console.error('attach.php failed', err);
    await releaseOrder(order.id);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Could not place order.' }),
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

This order is PENDING until you see a PayID transfer of $${total.toFixed(2)} AUD land in your account with reference "${reference}". Once confirmed, open the link below and press "Payment received - mark as sold", then arrange shipping with the customer.

Manage this order:
${manageUrl}

The piece(s) already show as sold on the website. If the customer never pays, use the same page to cancel the order and put the piece(s) back on sale; unpaid orders also go back on sale automatically after 3 days.`;

  try {
    const sent = await sendOwnerEmail({
      subject: `New PayID order ${reference} — $${total.toFixed(2)} AUD`,
      text: emailText,
      replyTo: customer.email,
    });

    if (!sent.ok) {
      console.error('Resend rejected the order email', sent.detail);
      await releaseOrder(order.id); // the order didn't actually go through — don't leave it locked
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Could not send order notification.' }),
      };
    }

    // Email the customer how to pay. Best-effort: the order is already placed and
    // your notification sent, and the same instructions are on the confirmation
    // page, so a failure here is logged but never fails the order.
    try {
      const notified = await callApi('notify.php', { order_id: order.id, event: 'payid_placed' });
      if (notified.status !== 200 || !notified.data?.ok) {
        console.error('notify.php did not queue the customer PayID email', reference, notified.status, notified.data);
      }
    } catch (err) {
      console.error('Could not ask notify.php to email the customer', reference, err);
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
    console.error('Unexpected error sending PayID order email', err);
    await releaseOrder(order.id);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Unexpected server error.' }),
    };
  }
};
