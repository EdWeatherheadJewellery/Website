import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import SparkleBackground from './components/SparkleBackground';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Jewellery from './pages/Jewellery';
import Product from './pages/Product';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import ShippingReturns from './pages/ShippingReturns';
import About from './pages/About';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';

// React Router doesn't reset scroll position on navigation the way a full
// page load does, so without this, navigating to a new page can land you
// part-way down it if the previous page was scrolled.
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <HelmetProvider>
      <ScrollToTop />
      <SparkleBackground />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Jewellery />} />
          <Route path="/shop/:name" element={<Product />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/shipping-returns" element={<ShippingReturns />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </HelmetProvider>
  );
}
