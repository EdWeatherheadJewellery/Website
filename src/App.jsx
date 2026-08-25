import { Routes, Route } from 'react-router-dom';
import SparkleBackground from './components/SparkleBackground';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Shop from './pages/Shop';
import Archive from './pages/Archive';
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
          <Route path="/shop" element={<Shop />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
