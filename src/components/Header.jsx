import { NavLink } from 'react-router-dom';
import Navbar from './Navbar';
import './Header.css';

export default function Header() {
  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <NavLink to="/" className="site-header-brand" end>
          <img src="../images/logo.svg" />
          Ed Weatherhead Jewellery
          {/* Your Jewellery Business */}
        </NavLink>
        <Navbar />
      </div>
    </header>
  );
}
