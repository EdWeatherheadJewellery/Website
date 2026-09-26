import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { products } from '../data/products';

const CartContext = createContext(null);
const STORAGE_KEY = 'eww-cart';

// Cart entries only ever store a refnumber + quantity — the source of
// truth for price, title, availability etc. is always src/data/products.js,
// looked up fresh on every render. That way the cart can never drift out
// of sync with a price change, and a sold/archived piece is caught here
// too, not just at the payment step.

function loadInitialState() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'add':
      // Every piece here is one-of-a-kind, so "adding" an item already in
      // the cart is a no-op rather than incrementing a quantity.
      return state.some((i) => i.refnumber === action.refnumber)
        ? state
        : [...state, { refnumber: action.refnumber, quantity: 1 }];
    case 'remove':
      return state.filter((i) => i.refnumber !== action.refnumber);
    case 'clear':
      return [];
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, undefined, loadInitialState);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Private browsing / storage quota — cart still works for this
      // session, it just won't be there on the next visit.
    }
  }, [items]);

  // Resolve full product details for what's in the cart, and drop
  // anything that's since sold, been archived, or no longer exists —
  // so the cart page never shows something the customer can't actually buy.
  const detailedItems = useMemo(
    () =>
      items
        .map((i) => {
          const product = products.find((p) => p.refnumber === i.refnumber);
          if (!product || product.sold || product.archived || !product.price) return null;
          return { ...i, product };
        })
        .filter(Boolean),
    [items]
  );

  const subtotal = useMemo(
    () => detailedItems.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0),
    [detailedItems]
  );

  const value = useMemo(
    () => ({
      items: detailedItems,
      count: detailedItems.length,
      subtotal,
      isInCart: (refnumber) => items.some((i) => i.refnumber === refnumber),
      addItem: (refnumber) => dispatch({ type: 'add', refnumber }),
      removeItem: (refnumber) => dispatch({ type: 'remove', refnumber }),
      clearCart: () => dispatch({ type: 'clear' }),
    }),
    [detailedItems, subtotal, items]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
