import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Loads the product catalogue from the PHP API on your hosting (products.php),
// replacing the old static src/data/products.js. Products arrive in exactly the
// same shape the old file used ({ refnumber, name, title, price, metal, ... }),
// so components read them the same way — the only new thing to handle is that
// they arrive a moment after the page loads.
//
// API location: set VITE_API_BASE_URL (see .env.example). If it isn't set, the
// site assumes the API is served from the same domain at /api.
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');
const CACHE_KEY = 'ewj-products-v1';

// The last catalogue we received is kept for the current browser tab only. It
// makes navigating around instant and lets the shop keep working through a
// brief API hiccup. It is replaced by fresh data on every page load, and
// checkout never relies on it — availability is always re-checked server-side.
function readCache() {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(CACHE_KEY) || 'null');
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(products) {
  try {
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(products));
  } catch {
    // Storage unavailable (private browsing / quota) — just skip caching.
  }
}

const ProductsContext = createContext(null);

export function ProductsProvider({ children }) {
  // status: 'loading' (nothing to show yet) | 'ready' | 'error' (failed and nothing cached)
  const [state, setState] = useState(() => {
    const cached = readCache();
    return cached ? { products: cached, status: 'ready' } : { products: [], status: 'loading' };
  });

  const load = useCallback(async (signal) => {
    try {
      const res = await fetch(`${API_BASE}/products.php`, { signal, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Product service returned ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data?.products)) throw new Error('Unexpected product data.');
      writeCache(data.products);
      setState({ products: data.products, status: 'ready' });
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Could not load products:', err);
      // If we already have a catalogue (from this tab's cache), keep showing it.
      setState((s) => (s.status === 'ready' ? s : { products: [], status: 'error' }));
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const reload = useCallback(() => {
    setState((s) => (s.status === 'error' ? { products: [], status: 'loading' } : s));
    load();
  }, [load]);

  const value = useMemo(() => {
    const { products, status } = state;
    const active = products.filter((p) => !p.archived);
    const flagged = active.filter((p) => p.featured);
    return {
      products,
      status,
      reload,
      activeProducts: active,
      archivedProducts: products.filter((p) => p.archived),
      // Pieces flagged "featured" in the database; falls back to the first
      // three active pieces if none are flagged.
      featuredProducts: flagged.length > 0 ? flagged : active.slice(0, 3),
    };
  }, [state, reload]);

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error('useProducts must be used within a ProductsProvider');
  return ctx;
}
