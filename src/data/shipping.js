// Shipping settings — shared between the frontend (to display an estimate)
// and both payment backends (for the amount actually charged), so there's
// only one place to update rates.
//
// TODO: these are placeholder figures — replace with your real shipping
// cost and free-shipping threshold before going live.
export const SHIPPING_FLAT_RATE = 10.35; // AUD — e.g. insured tracked post within Australia
export const FREE_SHIPPING_THRESHOLD = 100; // AUD subtotal — free shipping at or above this
export const SHIPPING_COUNTRIES = ['AU']; // ISO country codes you currently ship to

export function calculateShipping(subtotal) {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT_RATE;
}
