import { Link } from 'react-router-dom';
import './ProductCard.css';

export default function ProductCard({ product }) {
  const thumb = `/gallery/${product.name}_01.jpg`;

  return (
    <Link to={`/shop/${product.name}`} className="product-card">
      <div className="product-card-image-wrap">
        <img src={thumb} alt={product.title} className="product-card-image" loading="lazy" />
        {product.commission ? (
          <span className="product-card-badge product-card-commission">By request</span>
        ) : (
          product.sold && <span className="product-card-badge product-card-sold">Sold</span>
        )}
        <span className="product-card-zoom">View details</span>
      </div>
      <div className="product-card-body">
        <h3>{product.title}</h3>
        <div className="product-card-meta">
          {product.stone.map((tag) => <span key={tag}>{tag}</span>)}
          {product.metal.map((tag) => <span key={tag}>{tag}</span>)}
          {/* {!product.sold && !product.archived && product.price && <span className="product-card-price">${product.price}</span>} */}
        </div>
      </div>
    </Link>
  );
}
