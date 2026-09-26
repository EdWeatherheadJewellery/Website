// A small "is this piece still available right now?" lock, backed by
// Netlify Blobs. This exists purely to stop two customers from both
// successfully paying for the same one-of-a-kind piece at nearly the same
// time — it does NOT replace the `sold` flag in src/data/products.js, which
// is what actually controls what shows in the shop. Think of this as a
// short-lived, real-time layer sitting in front of that static file: the
// static file is what customers see; this is what checkout actually
// enforces at the moment of purchase.
//
// How it works: reserving an item is an atomic "create if it doesn't
// already exist" write (Netlify Blobs' `onlyIfNew`). If two requests race
// to reserve the same refnumber, exactly one of those writes can succeed —
// that's the actual guarantee this whole feature rests on.
//
// Netlify Blobs has no built-in expiry, so abandoned reservations (a
// customer who never finishes paying) are released lazily: every hold
// carries its own `expiresAt`, and the next reservation attempt for that
// item is allowed to reclaim it once that time has passed, using a
// compare-and-swap write (`onlyIfMatch`) so a genuinely-concurrent reclaim
// attempt still can't double-grant it.
//
// IMPORTANT: a card sale only becomes permanent ("sold", never expiring)
// when the Stripe webhook (stripe-webhook.js) confirms payment succeeded.
// If that webhook is never set up, or misfires, a paid-for item will still
// silently become available again once its hold expires — so the webhook
// isn't optional polish, it's what makes a sale actually stick.

import { getStore } from '@netlify/blobs';

const RESERVATION_MS = 30 * 60 * 1000; // card checkout: release after 30 min if abandoned
const PAYID_HOLD_MS = 3 * 24 * 60 * 60 * 1000; // PayID: release after 3 days if payment never confirmed

function store() {
  // "strong" consistency trades a little read latency for reads that are
  // guaranteed up to date — worth it here, since this store exists
  // specifically to make correctness decisions, not for fast display data.
  return getStore({ name: 'inventory-holds', consistency: 'strong' });
}

// Tries to reserve every refnumber, all-or-nothing. Returns { ok: true } if
// every item was successfully held, or { ok: false, unavailable } naming
// the first item that couldn't be reserved (already sold, or already held
// by someone else's still-active reservation) so the caller can show a
// clear error instead of silently dropping it.
export async function reserveItems(refnumbers, { method, reference } = {}) {
  const claimed = [];

  for (const refnumber of refnumbers) {
    const hold = {
      status: 'reserved',
      method,
      reference,
      expiresAt: Date.now() + (method === 'payid' ? PAYID_HOLD_MS : RESERVATION_MS),
    };

    const { modified } = await store().setJSON(refnumber, hold, { onlyIfNew: true });

    if (modified) {
      claimed.push(refnumber);
      continue;
    }

    // Something's already there. The only way we're allowed to take it is
    // if it's a reservation (never a permanent "sold" record) and its own
    // expiry time has passed.
    const existing = await store().getWithMetadata(refnumber, { type: 'json' });
    const isExpired = existing?.data?.status === 'reserved' && existing.data.expiresAt < Date.now();

    if (isExpired) {
      const { modified: reclaimed } = await store().setJSON(refnumber, hold, { onlyIfMatch: existing.etag });
      if (reclaimed) {
        claimed.push(refnumber);
        continue;
      }
      // Someone else reclaimed it in the instant between our read and
      // write — fall through and treat it as unavailable, same as below.
    }

    // Couldn't get this one. Release anything already claimed for this
    // same order so we don't leave orphaned holds behind on the rest of
    // the cart.
    await Promise.all(claimed.map((r) => store().delete(r)));
    return { ok: false, unavailable: refnumber };
  }

  return { ok: true };
}

// Releases holds early — used when a reservation succeeded but the rest of
// the checkout attempt then failed for some other reason, so the item
// doesn't sit needlessly locked until its hold naturally expires.
export async function releaseItems(refnumbers) {
  await Promise.all(refnumbers.map((refnumber) => store().delete(refnumber)));
}

// Called by the Stripe webhook once payment has actually succeeded — turns
// a temporary hold into a permanent, non-expiring "sold" record.
export async function confirmSold(refnumbers) {
  await Promise.all(
    refnumbers.map((refnumber) =>
      store().setJSON(refnumber, { status: 'sold', at: new Date().toISOString() })
    )
  );
}
