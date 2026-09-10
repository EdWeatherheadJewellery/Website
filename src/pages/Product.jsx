import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { products } from '../data/products';
import '../components/ProductCard.css';
import './Product.css';

const SITE_NAME = 'Ed Weatherhead Jewellery';
const SITE_URL = 'https://edweatherheadjewellery.com';

function leadingZero(n) {
  return (n < 10 ? '0' : '') + n;
}

function Lightbox({ photos, index, onClose, onChange }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onChange((index + 1) % photos.length);
      if (e.key === 'ArrowLeft') onChange((index - 1 + photos.length) % photos.length);
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [index, photos.length, onClose, onChange]);

  return (
    <div className="lightbox-backdrop" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose} aria-label="Close">&times;</button>

      {photos.length > 1 && (
        <button
          className="lightbox-nav lightbox-prev"
          aria-label="Previous photo"
          onClick={(e) => { e.stopPropagation(); onChange((index - 1 + photos.length) % photos.length); }}
        >
          &#8249;
        </button>
      )}

      <img
        src={photos[index]}
        alt=""
        className="lightbox-img"
        onClick={(e) => e.stopPropagation()}
      />

      {photos.length > 1 && (
        <button
          className="lightbox-nav lightbox-next"
          aria-label="Next photo"
          onClick={(e) => { e.stopPropagation(); onChange((index + 1) % photos.length); }}
        >
          &#8250;
        </button>
      )}
    </div>
  );
}

function NotFoundProduct() {
  return (
    <section className="container" style={{ position: 'relative', zIndex: 1, padding: 'var(--space-5) var(--space-3)' }}>
      <Helmet>
        <title>Product not found — {SITE_NAME}</title>
      </Helmet>
      <p className="eyebrow">Jewellery</p>
      <h1 style={{ fontSize: 'var(--size-xl)' }}>We couldn't find that piece</h1>
      <p>It may have been sold, retired, or the link may be out of date.</p>
      <Link to="/shop" className="product-page-back">← Back to shop</Link>
    </section>
  );
}

export default function Product() {
  const { name } = useParams();
  const [lightboxIndex, setLightboxIndex] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [name]);

  const product = products.find((p) => p.name === name);

  if (!product) {
    return <NotFoundProduct />;
  }

  const photos = Array.from(
    { length: product.pics },
    (_, i) => `/gallery/${product.name}_${leadingZero(i + 1)}.jpg`
  );

  const metaDescription = (product.descr || `${product.title} — handmade jewellery.`)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
  const ogImage = `${SITE_URL}${photos[0]}`;

  return (
    <section className="container product-page" style={{ position: 'relative', zIndex: 1, padding: 'var(--space-5) var(--space-3)' }}>
      <Helmet>
        <title>{product.title} — {SITE_NAME}</title>
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content={`${product.title} — ${SITE_NAME}`} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:type" content="product" />
      </Helmet>

      <Link to="/shop" className="product-page-back">← Back to shop</Link>

      <p className="eyebrow">Jewellery</p>
      <h1 style={{ fontSize: 'var(--size-xl)' }}>{product.title}</h1>

      {product.commission ? (
        <p className="product-page-badge product-page-commission">Available by request</p>
      ) : (
        product.sold && <p className="product-page-badge product-page-sold">Sold</p>
      )}

      <div className="product-card-meta">
        {product.stone.map((tag) => <span key={tag}>{tag}</span>)}
        {product.metal.map((tag) => <span key={tag}>{tag}</span>)}
      </div>

      {/* {!product.sold && !product.archived && product.price && (
        <p className="product-page-price">${product.price}</p>
      )} */}

      {product.descr && <p className="product-page-descr">{product.descr}</p>}

      <div className="product-page-gallery">
        {photos.map((src, i) => (
          <button
            key={src}
            type="button"
            className="product-page-img-btn"
            onClick={() => setLightboxIndex(i)}
            aria-label={`View photo ${i + 1} of ${product.title} full size`}
          >
            <img src={src} alt={`${product.title} — photo ${i + 1}`} className="product-page-img" loading="lazy" />
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      )}
    </section>
  );
}
