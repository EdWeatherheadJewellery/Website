import { Routes, Route } from 'react-router-dom';
import SparkleBackground from './components/SparkleBackground';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Jewellery from './pages/Jewellery';
import About from './pages/About';
import Contact from './pages/Contact';

export default function App() {
  return (
    <>
      <SparkleBackground />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Jewellery />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
