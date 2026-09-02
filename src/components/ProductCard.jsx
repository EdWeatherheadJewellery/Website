import './ProductCard.css';

export default function ProductCard({ product, onOpen }) {
  const thumb = `/gallery/${product.name}_01.jpg`;

  return (
    <button className="product-card" onClick={() => onOpen(product)}>
      <div className="product-card-image-wrap">
        <img src={thumb} alt={product.title} className="product-card-image" loading="lazy" />
        {product.sold && <span className="product-card-sold">Sold</span>}
        <span className="product-card-zoom">View gallery</span>
      </div>
      <div className="product-card-body">
        <h3>{product.title}</h3>
        <div className="product-card-meta">
          {product.stone.map((tag) => <span key={tag}>{tag}</span>)}
          {product.metal.map((tag) => <span key={tag}>{tag}</span>)}
          {/* {!product.sold && !product.archived && product.price && <span className="product-card-price">${product.price}</span>} */}
        </div>
      </div>
    </button>
  );
}
