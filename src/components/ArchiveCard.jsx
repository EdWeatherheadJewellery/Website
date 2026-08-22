import { useState } from 'react';
import './ArchiveCard.css';

function leadingZero(n) {
  return (n < 10 ? '0' : '') + n;
}

export default function ArchiveCard({ product }) {
  const [index, setIndex] = useState(0);
  const photos = Array.from(
    { length: product.pics },
    (_, i) => `/photos/${product.name}_${leadingZero(i + 1)}.jpg`
  );

  const hasMultiple = photos.length > 1;

  function prev() {
    setIndex((i) => (i - 1 + photos.length) % photos.length);
  }
  function next() {
    setIndex((i) => (i + 1) % photos.length);
  }

  return (
    <div className="archive-card">
      <div className="archive-card-image-wrap">
        <img
          src={photos[index]}
          alt={`${product.title} — photo ${index + 1} of ${photos.length}`}
          className="archive-card-image"
          loading="lazy"
        />
        {product.sold && <span className="archive-card-sold">Sold</span>}

        {hasMultiple && (
          <>
            <button className="archive-card-nav archive-card-nav-prev" onClick={prev} aria-label="Previous photo">
              &#8249;
            </button>
            <button className="archive-card-nav archive-card-nav-next" onClick={next} aria-label="Next photo">
              &#8250;
            </button>
            {photos.length <= 12 ? (
              <div className="archive-card-dots">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    className={'archive-card-dot' + (i === index ? ' is-active' : '')}
                    onClick={() => setIndex(i)}
                    aria-label={`Go to photo ${i + 1}`}
                  />
                ))}
              </div>
            ) : (
              <div className="archive-card-counter">
                {index + 1} / {photos.length}
              </div>
            )}
          </>
        )}

        <div className="archive-card-info">
          <h3>{product.title}</h3>
          {product.descr && <p>{product.descr}</p>}
        </div>
      </div>
    </div>
  );
}
