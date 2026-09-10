import { Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import SparkleBackground from './components/SparkleBackground';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Jewellery from './pages/Jewellery';
import Product from './pages/Product';
import About from './pages/About';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <HelmetProvider>
      <SparkleBackground />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Jewellery />} />
          <Route path="/shop/:name" element={<Product />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </HelmetProvider>
  );
}
