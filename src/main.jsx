import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ProductsProvider } from './context/ProductsContext';
import { CartProvider } from './context/CartContext';
import './styles/tokens.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ProductsProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </ProductsProvider>
    </BrowserRouter>
  </React.StrictMode>
);
