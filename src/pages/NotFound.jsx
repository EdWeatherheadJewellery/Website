import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function NotFound() {
  return (
    <section className="container" style={{ position: 'relative', zIndex: 1, padding: 'var(--space-5) var(--space-3)' }}>
      <Helmet>
        <title>Page not found — Ed Weatherhead Jewellery</title>
      </Helmet>
      <p className="eyebrow">404</p>
      <h1 style={{ fontSize: 'var(--size-xl)' }}>Page not found</h1>
      <p>The page you're looking for doesn't exist or may have moved.</p>
      <Link to="/">← Back to home</Link>
    </section>
  );
}
