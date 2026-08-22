import { NavLink } from 'react-router-dom';
import { navLinks } from './navLinks';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <nav className="footer-links">
          {navLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => 'footer-link' + (isActive ? ' is-active' : '')}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <p className="eyebrow">Handmade • Built to last</p>
        <p>&copy; {new Date().getFullYear()} Ed Weatherhead Jewellery. All pieces made by hand.</p>
      </div>
    </footer>
  );
}
