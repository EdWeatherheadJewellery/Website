import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useCart } from '../context/CartContext';
import { formatAUD } from '../utils/currency';
import './OrderSuccess.css';

const SITE_NAME = 'Ed Weatherhead Jewellery';
const BUSINESS_PAYID = '75218463253'; // TODO: keep in sync with Checkout.jsx
const BUSINESS_PAYID_NAME = 'E F WEATHERHEAD';

export default function OrderSuccess() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { clearCart } = useCart();
  const sessionId = searchParams.get('session_id');
  const payidOrder = location.state?.method === 'payid' ? location.state.order : null;

  const [cardOrder, setCardOrder] = useState(null);
  const [status, setStatus] = useState(sessionId ? 'loading' : 'idle');

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    fetch(`/.netlify/functions/get-checkout-session?session_id=${encodeURIComponent(sessionId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.paid) {
          setCardOrder(data);
          setStatus('paid');
          clearCart(); // safe to clear now — Stripe has confirmed payment succeeded
        } else {
          setStatus('unpaid');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => { cancelled = true; };
    // clearCart is stable (from context) and intentionally excluded from
    // deps to avoid re-running this fetch on every cart change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <section className="container order-success-page" style={{ position: 'relative', zIndex: 1, padding: 'var(--space-5) var(--space-3)' }}>
      <Helmet>
        <title>Order confirmation — {SITE_NAME}</title>
      </Helmet>

      {status === 'loading' && <p>Confirming your order…</p>}

      {status === 'paid' && cardOrder && (
        <>
          <p className="eyebrow">Thank you</p>
          <h1 style={{ fontSize: 'var(--size-xl)' }}>Your order is confirmed</h1>
          <p>A receipt has been sent to {cardOrder.customerEmail || 'your email'}. We'll be in touch about dispatch shortly.</p>

          <ul className="order-success-list">
            {cardOrder.lineItems.map((li, i) => (
              <li key={i}>
                <span>{li.name}{li.quantity > 1 ? ` × ${li.quantity}` : ''}</span>
                <span>{formatAUD(li.amount)}</span>
              </li>
            ))}
          </ul>
          <p className="order-success-total">Total paid: {formatAUD(cardOrder.amountTotal)}</p>

          {cardOrder.shippingAddress && (
            <div className="order-success-address">
              <p className="eyebrow">Shipping to</p>
              <p>
                {cardOrder.shippingAddress.line1}<br />
                {cardOrder.shippingAddress.line2 && <>{cardOrder.shippingAddress.line2}<br /></>}
                {cardOrder.shippingAddress.city} {cardOrder.shippingAddress.state} {cardOrder.shippingAddress.postal_code}<br />
                {cardOrder.shippingAddress.country}
              </p>
            </div>
          )}
        </>
      )}

      {(status === 'unpaid' || status === 'error') && (
        <>
          <p className="eyebrow">Order status</p>
          <h1 style={{ fontSize: 'var(--size-xl)' }}>We couldn't confirm this order</h1>
          <p>
            If you completed payment, please check your email for a Stripe receipt, or{' '}
            <Link to="/contact">get in touch</Link> and we'll look into it. If you cancelled before paying, nothing has been charged.
          </p>
        </>
      )}

      {payidOrder && (
        <>
          <p className="eyebrow">Order placed</p>
          <h1 style={{ fontSize: 'var(--size-xl)' }}>One more step — pay via PayID</h1>
          <p>Your order is reserved and pending payment. Please transfer the total below using your banking app.</p>

          <div className="order-success-payid-box">
            <p className="eyebrow">Pay to</p>
            <p className="order-success-payid-id">{BUSINESS_PAYID}</p>
            <p>{BUSINESS_PAYID_NAME}</p>
            <p className="eyebrow" style={{ marginTop: 'var(--space-2)' }}>Reference (important — please include this)</p>
            <p className="order-success-reference">{payidOrder.reference}</p>
            <p className="eyebrow" style={{ marginTop: 'var(--space-2)' }}>Amount</p>
            <p className="order-success-total">{formatAUD(payidOrder.total)}</p>
          </div>

          <ul className="order-success-list">
            {payidOrder.items.map((item) => (
              <li key={item.refnumber}>
                <span>{item.title}</span>
                <span>{formatAUD(item.price)}</span>
              </li>
            ))}
          </ul>

          <p>We'll email you once we see your payment arrive (usually within one business day) and confirm dispatch details.</p>
        </>
      )}

      {status === 'idle' && !payidOrder && (
        <>
          <p className="eyebrow">Order status</p>
          <h1 style={{ fontSize: 'var(--size-xl)' }}>No order found</h1>
          <p>We couldn't find any order details here. If you're looking for an existing order, check your email confirmation, or <Link to="/contact">get in touch</Link>.</p>
        </>
      )}

      <Link to="/shop" className="product-page-back">← Continue browsing</Link>
    </section>
  );
}
