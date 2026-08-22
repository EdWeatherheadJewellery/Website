import { useState } from 'react';
import ProductCard from './ProductCard';
import ProductModal from './ProductModal';
import './ProductGrid.css';

export default function ProductGrid({ products }) {
  const [openProduct, setOpenProduct] = useState(null);

  return (
    <>
      <div className="product-grid">
        {products.map((p) => (
          <ProductCard key={p.name} product={p} onOpen={setOpenProduct} />
        ))}
      </div>
      {openProduct && (
        <ProductModal product={openProduct} onClose={() => setOpenProduct(null)} />
      )}
    </>
  );
}
