import { useEffect, useMemo, useState } from 'react';
import ProductGrid from '../components/ProductGrid';
import { products, activeProducts, archivedProducts } from '../data/products';
import './Jewellery.css';

const TABS = [
  { id: 'shop', label: 'Shop' },
  { id: 'archive', label: 'Archive' },
  { id: 'gallery', label: 'Show all' },
];

function FilterGroup({ title, options, selected, onToggle }) {
  if (options.length === 0) return null;
  return (
    <details className="filter-group" open>
      <summary className="eyebrow filter-group-title">{title}</summary>
      <div className="filter-pills">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={'filter-pill' + (selected.includes(opt) ? ' is-active' : '')}
            onClick={() => onToggle(opt)}
            aria-pressed={selected.includes(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </details>
  );
}

// Stone filter: searchable dropdown with checkboxes (multi-select), instead of pills.
function StoneFilter({ options, selected, onToggle }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  if (options.length === 0) return null;

  const visible = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

  return (
    <details className="filter-group" open>
      <summary className="eyebrow filter-group-title">Stone</summary>
      <div className="stone-dropdown">
        <button
          type="button"
          className="stone-dropdown-toggle"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span>{selected.length > 0 ? `${selected.length} selected` : 'Any stone'}</span>
          <img src="/images/chevron-down.svg" alt="" className="stone-dropdown-chevron" aria-hidden="true" />
        </button>
        {open && (
          <div className="stone-dropdown-panel">
            <input
              type="text"
              className="stone-dropdown-search"
              placeholder="Search stones…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <div className="stone-dropdown-options">
              {visible.map((opt) => (
                <label key={opt} className="stone-dropdown-option">
                  <input
                    type="checkbox"
                    checked={selected.includes(opt)}
                    onChange={() => onToggle(opt)}
                  />
                  {opt}
                </label>
              ))}
              {visible.length === 0 && <p className="stone-dropdown-empty">No matches</p>}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}

// Shared by the Shop and Gallery tabs — same type/metal/stone filter UI,
// just operating over a different underlying product list.
function ProductListView({ items }) {
  const [type, setType] = useState('all');
  const [metals, setMetals] = useState([]);
  const [stones, setStones] = useState([]);
  const [sort, setSort] = useState('recent');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    () => window.matchMedia('(min-width: 641px)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 641px)');
    const handleChange = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const types = useMemo(
    () => ['all', ...new Set(items.map((p) => p.type).filter(Boolean))],
    [items]
  );
  const metalOptions = useMemo(
    () => [...new Set(items.map((p) => p.metal).filter(Boolean))],
    [items]
  );
  const stoneOptions = useMemo(
    () => [...new Set(items.map((p) => p.stone).filter(Boolean))],
    [items]
  );

  function toggle(list, setList, value) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  // Within a filter group, selections are OR'd (any checked metal matches).
  // Across groups — type, metal, stone — results are AND'd together.
  const filtered = items.filter((p) => {
    if (type !== 'all' && p.type !== type) return false;
    if (metals.length > 0 && !metals.includes(p.metal)) return false;
    if (stones.length > 0 && !stones.includes(p.stone)) return false;
    return true;
  });

  const activeFilterCount = (type !== 'all' ? 1 : 0) + metals.length + stones.length;

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case 'price-desc':
        return (Number(b.price) || 0) - (Number(a.price) || 0);
      case 'price-asc':
        return (Number(a.price) || 0) - (Number(b.price) || 0);
      case 'metal':
        return (a.metal || '').localeCompare(b.metal || '');
      case 'recent':
      default:
        return b.refnumber - a.refnumber;
    }
  });

  return (
    <>
      <div className="sort-control">
        <label htmlFor="sort-select" className="eyebrow">Sort by</label>
        <select id="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recent">Recently added</option>
          <option value="price-desc">Price: high to low</option>
          <option value="price-asc">Price: low to high</option>
          <option value="metal">Metal (A–Z)</option>
        </select>
      </div>

      <details
        className="filter-group-wrapper"
        open={isDesktop || filtersOpen}
        onToggle={(e) => {
          if (!isDesktop) setFiltersOpen(e.target.open);
        }}
      >
        <summary className="eyebrow filter-group-wrapper-title">
          Filters
          <img src="/images/chevron-down.svg" alt="" className="filter-group-wrapper-chevron" aria-hidden="true" />
        </summary>
        <div className="filter-group-wrapper-content">
          <details className="filter-group" open>
            <summary className="eyebrow filter-group-title">Type</summary>
            <div className="filter-pills">
              {types.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={'filter-pill' + (t === type ? ' is-active' : '')}
                  onClick={() => setType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </details>

          <FilterGroup title="Metal" options={metalOptions} selected={metals} onToggle={(v) => toggle(metals, setMetals, v)} />
          <StoneFilter options={stoneOptions} selected={stones} onToggle={(v) => toggle(stones, setStones, v)} />
        </div>
      </details>

      {activeFilterCount > 0 && (
        <button
          type="button"
          className="filter-clear"
          onClick={() => { setType('all'); setMetals([]); setStones([]); }}
        >
          Clear filters
        </button>
      )}

      <ProductGrid products={sorted} />
    </>
  );
}

export default function Jewellery() {
  const [activeTab, setActiveTab] = useState('shop');

  return (
    <section className="container" style={{ position: 'relative', zIndex: 1, padding: 'var(--space-5) var(--space-3)' }}>
      <p className="eyebrow">Jewellery</p>
      {/* <h1 style={{ fontSize: 'var(--size-xl)' }}>Browse in-house pieces</h1> */}
      <h1 style={{ fontSize: 'var(--size-xl)' }}>Opening soon</h1>

      <div className="jewellery-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={'jewellery-tab' + (activeTab === tab.id ? ' is-active' : '')}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'shop' && <ProductListView items={activeProducts()} />}
      {activeTab === 'gallery' && <ProductListView items={products} />}
      {activeTab === 'archive' && <ProductListView items={archivedProducts()} />}
    </section>
  );
}
