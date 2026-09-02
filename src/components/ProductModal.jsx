import { useEffect } from 'react';
import './ProductModal.css';
import './ProductCard.css';

function leadingZero(n) {
  return (n < 10 ? '0' : '') + n;
}

export default function ProductModal({ product, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const photos = Array.from(
    { length: product.pics },
    (_, i) => `/gallery/${product.name}_${leadingZero(i + 1)}.jpg`
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close gallery">
          &times;
        </button>
        <h2>{product.title}</h2>
        {product.sold && <p className="modal-sold">Sold</p>}
        <div className="product-card-meta">
          {product.stone.map((tag) => <span key={tag}>{tag}</span>)}
          {product.metal.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
        <p className='modal-descr'>{product.descr}</p>
        {/* {!product.sold && product.price && (
          <p className="modal-price">${product.price}</p>
        )} */}
        <div className="modal-gallery">
          {photos.map((src, i) => (
            <img key={src} src={src} alt={`${product.title} — photo ${i + 1}`} className="modal-img" loading="lazy" />
          ))}
        </div>
      </div>
    </div>
  );
}
