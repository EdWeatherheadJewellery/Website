import Navbar from './Navbar';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <Navbar />
        <p className="eyebrow">Handmade • Created with care</p>
        <p>&copy; {new Date().getFullYear()} Ed Weatherhead Jewellery • ABN 75218463253</p>
      </div>
    </footer>
  );
}
