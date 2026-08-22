import Hero from '../components/Hero';
import ProductGrid from '../components/ProductGrid';
import { activeProducts } from '../data/products';

export default function Home() {
  const featured = activeProducts().slice(0, 3);

  return (
    <>
      <Hero />
      <section className="container" style={{ position: 'relative', zIndex: 1, paddingBottom: 'var(--space-5)' }}>
        <p className="eyebrow">Recently made</p>
        <h2>A few pieces from the workshop</h2>
        <ProductGrid products={featured} />
      </section>
    </>
  );
}
