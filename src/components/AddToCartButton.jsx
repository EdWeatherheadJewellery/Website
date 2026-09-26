import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import './AddToCartButton.css';

export default function AddToCartButton({ product }) {
  const { addItem, removeItem, isInCart } = useCart();
  const [announcement, setAnnouncement] = useState('');

  // Not everything in the catalogue is purchasable — say so clearly rather
  // than just hiding the button, so it's obvious this isn't a bug.
  if (product.commission) {
    return <p className="cart-status cart-status-info">Available by request — get in touch to commission this piece.</p>;
  }
  if (product.sold) {
    return <p className="cart-status cart-status-info">This piece has been sold.</p>;
  }
  if (product.archived || !product.price) {
    return null;
  }

  const inCart = isInCart(product.refnumber);

  function handleAdd() {
    addItem(product.refnumber);
    setAnnouncement(`${product.title} added to cart.`);
  }

  function handleRemove() {
    removeItem(product.refnumber);
    setAnnouncement(`${product.title} removed from cart.`);
  }

  return (
    <div className="add-to-cart">
      {inCart ? (
        <div className="add-to-cart-in-cart">
          <p className="cart-status cart-status-success">✓ In your cart</p>
          <button type="button" className="add-to-cart-remove" onClick={handleRemove}>
            Remove
          </button>
          <Link to="/cart" className="add-to-cart-view">View cart</Link>
        </div>
      ) : (
        <button type="button" className="add-to-cart-button" onClick={handleAdd}>
          Add to cart
        </button>
      )}
      {/* Polite live region so screen reader users hear the outcome without
          focus being moved away from the button. */}
      <p className="visually-hidden" role="status" aria-live="polite">{announcement}</p>
    </div>
  );
}
