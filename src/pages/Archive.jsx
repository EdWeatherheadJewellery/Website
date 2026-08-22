import { Link } from 'react-router-dom';
import ArchiveCard from '../components/ArchiveCard';
import { archivedProducts } from '../data/products';
import './Archive.css';

export default function Archive() {
  const pieces = archivedProducts();

  return (
    <section className="container" style={{ position: 'relative', zIndex: 1, padding: 'var(--space-5) var(--space-3)' }}>
      <p className="eyebrow">From the workshop</p>
      <h1 style={{ fontSize: 'var(--size-xl)' }}>Older Work</h1>
      <p style={{ marginBottom: 'var(--space-4)' }}>
Here are some older pieces from my workshop. These are no longer available, and many of them are not up to my current standards, but they provide a window into my style and my jewellery-making journey. 
If you see something you like, you're welcome to <Link to="/contact">contact me</Link> about re-creating it.
      </p>
      <div className="archive-grid">
        {pieces.map((p) => (
          <ArchiveCard key={p.name} product={p} />
        ))}
      </div>
    </section>
  );
}