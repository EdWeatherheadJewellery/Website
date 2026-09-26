import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useCart } from '../context/CartContext';
import { formatAUD } from '../utils/currency';
import '../components/ProductCard.css';
import './Cart.css';

const SITE_NAME = 'Ed Weatherhead Jewellery';

export default function Cart() {
  const { items, subtotal, removeItem } = useCart();
  const navigate = useNavigate();

  return (
    <section className="container cart-page" style={{ position: 'relative', zIndex: 1, padding: 'var(--space-5) var(--space-3)' }}>
      <Helmet>
        <title>Your cart — {SITE_NAME}</title>
      </Helmet>

      <p className="eyebrow">Cart</p>
      <Link to="/shop" className="product-page-back">← Back to jewellery</Link>
      <h1 style={{ fontSize: 'var(--size-xl)' }}>Your cart</h1>

      {items.length === 0 ? (
        <div className="cart-empty">
          <p>Your cart is empty.</p>
          <Link to="/shop" className="product-page-back">← Browse the jewellery</Link>
        </div>
      ) : (
        <>
          <ul className="cart-list">
            {items.map(({ product }) => (
              <li key={product.refnumber} className="cart-item">
                <Link to={`/shop/${product.name}`} className="cart-item-image-link">
                  <img
                    src={`/gallery/${product.name}_01.jpg`}
                    alt=""
                    className="cart-item-image"
                    loading="lazy"
                  />
                </Link>
                <div className="cart-item-body">
                  <Link to={`/shop/${product.name}`} className="cart-item-title">{product.title}</Link>
                  <div className="product-card-meta">
                    {product.stone.map((tag) => <span key={tag}>{tag}</span>)}
                    {product.metal.map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                  <p className="cart-item-price">{formatAUD(product.price)}</p>
                </div>
                <button
                  type="button"
                  className="cart-item-remove"
                  onClick={() => removeItem(product.refnumber)}
                  aria-label={`Remove ${product.title} from cart`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <div className="cart-summary">
            <div className="cart-summary-row">
              <span>Subtotal</span>
              <span className="cart-summary-total">{formatAUD(subtotal)}</span>
            </div>
            <p className="cart-summary-note">Shipping is calculated at checkout.</p>
            <button type="button" className="add-to-cart-button cart-checkout-button" onClick={() => navigate('/checkout')}>
              Proceed to checkout
            </button>
            <Link to="/shop" className="cart-continue-shopping">Continue shopping</Link>
          </div>
        </>
      )}
    </section>
  );
}
