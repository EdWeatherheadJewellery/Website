import { NavLink } from 'react-router-dom';
import { navLinks } from './navLinks';
import './Navbar.css';

export default function Navbar() {
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
