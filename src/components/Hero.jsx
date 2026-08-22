import { Link } from 'react-router-dom';
import './Hero.css';

export default function Hero() {
  return (
    <section className="hero">
      <div className="container hero-inner">
        <div className="hero-text">
          <p className="eyebrow">Hand-made jewellery</p>
          {/* <h1>Thoughtfully designed & built to last</h1> */}
          <h1>Natural minerals, custom designs</h1>
          <p className="hero-sub">
Solid sterling silver, natural untreated minerals and gemstones, and freshwater pearls, constructed with care into pieces designed to be worn and enjoyed for years.
          </p>
          <div className="hero-actions">
            <Link to="/shop" className="hero-btn hero-btn-primary">Shop the collection</Link>
            <Link to="/contact" className="hero-btn hero-btn-secondary">Request a custom piece</Link>
          </div>
        </div>
        <div className="hero-media" aria-hidden="true">
          <div className="hero-image" role="img aria-label"></div>
        </div>
      </div>
    </section>
  );
}
