import { Link } from 'react-router-dom';
import Hero from '../components/Hero';
import ProductGrid from '../components/ProductGrid';
import CatalogueStatus from '../components/CatalogueStatus';
import { useProducts } from '../context/ProductsContext';
import './Home.css';

export default function Home() {
  // Which pieces appear here is set by the `featured` flag in the database.
  const { featuredProducts, status, reload } = useProducts();

  return (
    <>
      <Hero />
      <section className="container" style={{ position: 'relative', zIndex: 1, paddingBottom: 'var(--space-5)' }}>
        <p className="eyebrow">Recently made</p>
        <h2>A few pieces from the workshop</h2>
        {status === 'ready' ? <ProductGrid products={featuredProducts} /> : <CatalogueStatus status={status} onRetry={reload} />}
        <p className="home-shop-link-wrap">
          <Link to="/shop" className="home-shop-link">Shop the collection ›</Link>
        </p>
      </section>
    </>
  );
}
