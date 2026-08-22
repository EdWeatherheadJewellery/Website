import { useMemo, useState } from 'react';
import ProductGrid from '../components/ProductGrid';
import { activeProducts } from '../data/products';
import './Shop.css';

function FilterGroup({ title, options, selected, onToggle }) {
  if (options.length === 0) return null;
  return (
    <div className="filter-group">
      <p className="eyebrow filter-group-title">{title}</p>
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
    </div>
  );
}

export default function Shop() {
  const all = activeProducts();
  const [type, setType] = useState('all');
  const [metals, setMetals] = useState([]);
  const [stones, setStones] = useState([]);

  const types = useMemo(
    () => ['all', ...new Set(all.map((p) => p.type).filter(Boolean))],
    [all]
  );
  const metalOptions = useMemo(
    () => [...new Set(all.map((p) => p.metal).filter(Boolean))],
    [all]
  );
  const stoneOptions = useMemo(
    () => [...new Set(all.map((p) => p.stone).filter(Boolean))],
    [all]
  );

  function toggle(list, setList, value) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  // Within a filter group, selections are OR'd (any checked metal matches).
  // Across groups — type, metal, stone — results are AND'd together.
  const filtered = all.filter((p) => {
    if (type !== 'all' && p.type !== type) return false;
    if (metals.length > 0 && !metals.includes(p.metal)) return false;
    if (stones.length > 0 && !stones.includes(p.stone)) return false;
    return true;
  });

  const activeFilterCount = (type !== 'all' ? 1 : 0) + metals.length + stones.length;

  return (
    <section className="container" style={{ position: 'relative', zIndex: 1, padding: 'var(--space-5) var(--space-3)' }}>
      <p className="eyebrow">Shop</p>
      <h1 style={{ fontSize: 'var(--size-xl)' }}>Browse in-house pieces</h1>

      <div className="filter-group">
        <p className="eyebrow filter-group-title">Type</p>
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
      </div>

      <FilterGroup title="Metal" options={metalOptions} selected={metals} onToggle={(v) => toggle(metals, setMetals, v)} />
      <FilterGroup title="Stone" options={stoneOptions} selected={stones} onToggle={(v) => toggle(stones, setStones, v)} />

      {activeFilterCount > 0 && (
        <button
          type="button"
          className="filter-clear"
          onClick={() => { setType('all'); setMetals([]); setStones([]); }}
        >
          Clear filters
        </button>
      )}

      <ProductGrid products={filtered} />
    </section>
  );
}
