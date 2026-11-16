// Small client for the PHP API that lives next to your MySQL database on
// GreenGeeks (see the /api folder). Only these Netlify functions talk to the
// private endpoints; they prove who they are with a shared secret.
//
// Environment variables (set in Netlify -> Site configuration -> Environment variables):
//   API_BASE_URL   e.g. https://edweatherheadjewellery.com/api   (no trailing slash)
//   API_SECRET     must match 'api_secret' in the PHP config file on GreenGeeks

import { randomUUID } from 'node:crypto';

export async function callApi(endpoint, payload, { timeoutMs = 10000 } = {}) {
  const base = (process.env.API_BASE_URL || '').replace(/\/+$/, '');
  const secret = process.env.API_SECRET;
  if (!base || !secret) {
    throw new Error('API_BASE_URL and API_SECRET must be set.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': secret },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      // non-JSON body (e.g. a host error page) — callers treat data === null as a failure
    }
    return { status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

// The browser's per-tab id (see src/utils/cartSession.js). It's what lets the
// same customer reclaim their own hold after pressing Stripe's "back" link.
// If it's missing or malformed, use a throwaway id: that order simply can't
// reclaim an earlier hold.
export function resolveHolderId(candidate) {
  return typeof candidate === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(candidate) ? candidate : randomUUID();
}

// Turns a failed reserve.php response into the status code + message the
// frontend shows to the customer.
export function describeReservationFailure(data) {
  const title = data?.title || 'One of these items';
  switch (data?.reason) {
    case 'unknown':
      return { statusCode: 400, error: `Unknown item: ${data.refnumber}` };
    case 'sold':
    case 'archived':
      return { statusCode: 400, error: `${title} is no longer available.` };
    case 'no_price':
      return { statusCode: 400, error: `${title} is not available for direct purchase.` };
    case 'held':
      return {
        statusCode: 409,
        error: `${title} was just purchased by someone else. Please remove it from your cart and try again.`,
      };
    case 'bad_request':
      return { statusCode: 400, error: 'Invalid order request.' };
    default:
      return { statusCode: 500, error: 'Could not check item availability.' };
  }
}

// Frees a pending order's holds. Best-effort: if this fails, the hold simply
// lapses on its own when its timer runs out.
export async function releaseOrder(orderId, status = 'cancelled') {
  try {
    await callApi('release.php', { order_id: orderId, status });
  } catch (err) {
    console.error('Could not release order', orderId, err);
  }
}
