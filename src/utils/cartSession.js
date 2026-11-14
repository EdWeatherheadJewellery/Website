// A short random id identifying "this customer's in-progress attempt to buy
// this cart" in their own browser tab. Sent alongside every checkout
// request so the backend can tell "the same customer retrying" (e.g. they
// clicked Stripe's back button and are trying again) apart from "a
// different customer trying to buy an already-held item" — both would
// otherwise look identical to reserveItems().
//
// Stored in sessionStorage rather than localStorage: it should survive
// back/forward navigation and reloads within this tab (that's the whole
// point), but a brand new tab shouldn't inherit somebody else's
// in-progress hold, and it shouldn't linger forever either.
const KEY = 'eww-cart-session-id';

export function getCartSessionId() {
  if (typeof window === 'undefined') return null;
  try {
    let id = window.sessionStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return null; // private browsing / storage disabled — retry just won't be recognised as "the same customer"
  }
}
