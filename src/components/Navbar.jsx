import { NavLink } from 'react-router-dom';
import { navLinks } from './navLinks';
import './Navbar.css';

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <NavLink to="/" className="navbar-brand" end>
          <img src="../images/logo.svg" />
          Ed Weatherhead Jewellery
          {/* Your Jewellery Business */}
        </NavLink>
        <nav className="navbar-links">
          {navLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => 'navbar-link' + (isActive ? ' is-active' : '')}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
