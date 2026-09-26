import { NavLink } from 'react-router-dom';
import { navLinks } from './navLinks';
import { useCart } from '../context/CartContext';
import './Navbar.css';

export default function Navbar() {
  const { count } = useCart();

  return (
    <nav className="site-nav">
      {navLinks.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.end}
          className={({ isActive }) => 'site-nav-link' + (isActive ? ' is-active' : '')}
        >
          {l.label}
        </NavLink>
      ))}
      {/* <NavLink
        to="/cart"
        className={({ isActive }) => 'site-nav-link site-nav-cart' + (isActive ? ' is-active' : '')}
        aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? '' : 's'}` : 'Cart, empty'}
      >
        Cart{count > 0 && <span className="site-nav-cart-count" aria-hidden="true">{count}</span>}
      </NavLink> */}
      <a
        href="https://www.instagram.com/edweatherheadjewellery/"
        target="_blank"
        rel="noopener noreferrer"
        className="site-nav-icon-link"
        aria-label="Instagram"
      >
        <span className="icon-instagram" />
      </a>
    </nav>
  );
}
