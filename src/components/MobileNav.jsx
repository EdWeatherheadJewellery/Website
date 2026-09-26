import { NavLink } from 'react-router-dom';
import { navLinks } from './navLinks';
import { useCart } from '../context/CartContext';
import './MobileNav.css';

// Used only in the header. Hidden above 720px via CSS; Navbar (shared with
// the footer) is hidden below 720px via CSS, so exactly one is visible at
// any given width.
export default function MobileNav() {
  const { count } = useCart();

  return (
    <details className="mobile-nav">
      <summary className="mobile-nav-toggle" aria-label="Menu">
        <span className="hamburger-icon" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </summary>
      <div className="mobile-nav-panel">
        {navLinks.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => 'mobile-nav-link' + (isActive ? ' is-active' : '')}
          >
            {l.label}
          </NavLink>
        ))}
        <NavLink
          to="/cart"
          className={({ isActive }) => 'mobile-nav-link' + (isActive ? ' is-active' : '')}
          aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? '' : 's'}` : 'Cart, empty'}
        >
          Cart{count > 0 && <span className="mobile-nav-cart-count" aria-hidden="true">{count}</span>}
        </NavLink>
        <a
          href="https://www.instagram.com/edweatherheadjewellery/"
          target="_blank"
          rel="noopener noreferrer"
          className="mobile-nav-link"
        >
          Instagram
        </a>
      </div>
    </details>
  );
}
