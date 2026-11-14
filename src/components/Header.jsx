import { NavLink } from 'react-router-dom';
import Navbar from './Navbar';
import MobileNav from './MobileNav';
import './Header.css';

export default function Header() {
  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <NavLink to="/" className="site-header-brand" end>
          <img src="../images/logo.svg" />
          Ed Weatherhead Jewellery
        </NavLink>
        <div className="site-header-nav-desktop">
          <Navbar />
        </div>
        <MobileNav />
      </div>
    </header>
  );
}
