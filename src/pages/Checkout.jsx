import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useCart } from '../context/CartContext';
import { formatAUD } from '../utils/currency';
import { calculateShipping, FREE_SHIPPING_THRESHOLD } from '../data/shipping';
import './Checkout.css';

const SITE_NAME = 'Ed Weatherhead Jewellery';

// TODO: replace with your actual PayID (an email or phone number linked to
// your business bank account) and the registered name it's linked to, so
// customers can double-check they're paying the right account.
const BUSINESS_PAYID = '75218463253';
const BUSINESS_PAYID_NAME = 'E F WEATHERHEAD';

const emptyCustomer = {
  name: '', email: '', phone: '',
  address1: '', address2: '', suburb: '', state: '', postcode: '', country: 'Australia',
};

const emptyBilling = {
  name: '', address1: '', address2: '', suburb: '', state: '', postcode: '', country: 'Australia',
};

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [method, setMethod] = useState('card');
  const [customer, setCustomer] = useState(emptyCustomer);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billing, setBilling] = useState(emptyBilling);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  if (items.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  const shipping = calculateShipping(subtotal);
  const total = subtotal + shipping;

  function updateField(field, value) {
    setCustomer((c) => ({ ...c, [field]: value }));
  }

  function updateBillingField(field, value) {
    setBilling((b) => ({ ...b, [field]: value }));
  }

  function validatePayidForm() {
    const required = { name: 'Name', email: 'Email', address1: 'Address', suburb: 'Suburb', state: 'State', postcode: 'Postcode' };
    const next = {};
    for (const [field, label] of Object.entries(required)) {
      if (!customer[field].trim()) next[field] = `${label} is required.`;
    }
    if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
      next.email = 'Enter a valid email address.';
    }
    if (!billingSameAsShipping) {
      const billingRequired = { name: 'Billing name', address1: 'Billing address', suburb: 'Billing suburb', state: 'Billing state', postcode: 'Billing postcode' };
      for (const [field, label] of Object.entries(billingRequired)) {
        if (!billing[field].trim()) next[`billing.${field}`] = `${label} is required.`;
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleCardCheckout() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items.map(({ product }) => ({ refnumber: product.refnumber, quantity: 1 })) }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start checkout.');
      window.location.href = data.url; // hands off to Stripe's hosted, secure payment page
    } catch (err) {
      setSubmitError(err.message);
      setSubmitting(false);
    }
  }

  async function handlePayidOrder(e) {
    e.preventDefault();
    setSubmitError(null);
    if (!validatePayidForm()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/.netlify/functions/send-payid-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(({ product }) => ({ refnumber: product.refnumber, quantity: 1 })),
          customer,
          billing: billingSameAsShipping ? null : billing,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not place order.');

      clearCart();
      navigate('/order-success', { state: { method: 'payid', order: data } });
    } catch (err) {
      setSubmitError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <section className="container checkout-page" style={{ position: 'relative', zIndex: 1, padding: 'var(--space-5) var(--space-3)' }}>
      <Helmet>
        <title>Checkout — {SITE_NAME}</title>
      </Helmet>

      <p className="eyebrow">Checkout</p>
      <Link to="/shop" className="product-page-back">← Back to jewellery</Link>
      <h1 style={{ fontSize: 'var(--size-xl)' }}>Checkout</h1>

      <div className="checkout-layout">
        <div className="checkout-main">
          <fieldset className="payment-method-fieldset">
            <legend className="eyebrow">Payment method</legend>

            <label className={'payment-method-option' + (method === 'card' ? ' is-selected' : '')}>
              <input type="radio" name="method" value="card" checked={method === 'card'} onChange={() => setMethod('card')} />
              <span>
                <strong>Card</strong>
                <span className="payment-method-sub">Visa or Mastercard · secure payment via Stripe</span>
              </span>
            </label>

            <label className={'payment-method-option' + (method === 'payid' ? ' is-selected' : '')}>
              <input type="radio" name="method" value="payid" checked={method === 'payid'} onChange={() => setMethod('payid')} />
              <span>
                <strong>PayID</strong>
                <span className="payment-method-sub">Instant bank transfer using your banking app</span>
              </span>
            </label>
          </fieldset>

          {submitError && (
            <p className="checkout-error" role="alert">{submitError}</p>
          )}

          {method === 'card' && (
            <div className="checkout-card-panel">
              <p className="checkout-security-note">
                🔒 You'll be taken to Stripe's secure payment page to enter your card details and shipping address. {SITE_NAME} never sees or stores your card number.
              </p>
              <button
                type="button"
                className="add-to-cart-button checkout-submit"
                onClick={handleCardCheckout}
                disabled={submitting}
                aria-busy={submitting}
              >
                {submitting ? 'Redirecting to secure payment…' : <>Continue to secure payment — <span className="no-wrap">{formatAUD(total)}</span></>}
              </button>
            </div>
          )}

          {method === 'payid' && (
            <form className="checkout-payid-panel" onSubmit={handlePayidOrder} noValidate>
              <p className="checkout-security-note">
                PayID payments are made directly through your own banking app, so we ask for your shipping details here first. After placing your order you'll see the PayID to pay, and your unique reference — your order is confirmed once we see the transfer arrive (usually within one business day).
              </p>

              <p className="form-section-label">Shipping details</p>
              <div className="form-grid">
                <Field label="Full name" name="name" value={customer.name} onChange={updateField} error={errors.name} autoComplete="name" />
                <Field label="Email" name="email" type="email" value={customer.email} onChange={updateField} error={errors.email} autoComplete="email" />
                <Field label="Phone (optional)" name="phone" type="tel" value={customer.phone} onChange={updateField} autoComplete="tel" />
                <Field label="Address" name="address1" value={customer.address1} onChange={updateField} error={errors.address1} autoComplete="address-line1" />
                <Field label="Address line 2 (optional)" name="address2" value={customer.address2} onChange={updateField} autoComplete="address-line2" />
                <Field label="Suburb" name="suburb" value={customer.suburb} onChange={updateField} error={errors.suburb} autoComplete="address-level2" />
                <Field label="State" name="state" value={customer.state} onChange={updateField} error={errors.state} autoComplete="address-level1" placeholder="e.g. VIC" />
                <Field label="Postcode" name="postcode" value={customer.postcode} onChange={updateField} error={errors.postcode} autoComplete="postal-code" />
                <Field label="Country" name="country" value={customer.country} onChange={updateField} autoComplete="country-name" />
              </div>

              <label className="billing-toggle">
                <input
                  type="checkbox"
                  checked={billingSameAsShipping}
                  onChange={(e) => setBillingSameAsShipping(e.target.checked)}
                />
                Billing name and address same as shipping
              </label>

              {!billingSameAsShipping && (
                <>
                  <p className="form-section-label">Billing details</p>
                  <div className="form-grid">
                    <Field idPrefix="billing-" label="Addressee's name" name="name" value={billing.name} onChange={updateBillingField} error={errors['billing.name']} autoComplete="name" />
                    <Field idPrefix="billing-" label="Address" name="address1" value={billing.address1} onChange={updateBillingField} error={errors['billing.address1']} autoComplete="address-line1" />
                    <Field idPrefix="billing-" label="Address line 2 (optional)" name="address2" value={billing.address2} onChange={updateBillingField} autoComplete="address-line2" />
                    <Field idPrefix="billing-" label="Suburb" name="suburb" value={billing.suburb} onChange={updateBillingField} error={errors['billing.suburb']} autoComplete="address-level2" />
                    <Field idPrefix="billing-" label="State" name="state" value={billing.state} onChange={updateBillingField} error={errors['billing.state']} autoComplete="address-level1" placeholder="e.g. VIC" />
                    <Field idPrefix="billing-" label="Postcode" name="postcode" value={billing.postcode} onChange={updateBillingField} error={errors['billing.postcode']} autoComplete="postal-code" />
                    <Field idPrefix="billing-" label="Country" name="country" value={billing.country} onChange={updateBillingField} autoComplete="country-name" />
                  </div>
                </>
              )}

              <button
                type="submit"
                className="add-to-cart-button checkout-submit"
                disabled={submitting}
                aria-busy={submitting}
              >
                {submitting ? 'Placing order…' : <>Place order — <span className="no-wrap">{formatAUD(total)}</span></>}
              </button>
            </form>
          )}

          <p className="checkout-policy-note">
            By placing an order you agree to our <Link to="/shipping-returns">shipping &amp; returns policy</Link>.
          </p>
        </div>

        <aside className="checkout-summary" aria-label="Order summary">
          <h2>Order summary</h2>
          <ul className="checkout-summary-list">
            {items.map(({ product }) => (
              <li key={product.refnumber}>
                <img
                  src={`/gallery/${product.name}_01.jpg`}
                  alt=""
                  className="checkout-summary-thumb"
                  loading="lazy"
                />
                <span className="checkout-summary-item-text">
                  <span className="checkout-summary-item-title">{product.title}</span>
                  <span className="checkout-summary-item-price">{formatAUD(product.price)}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="checkout-summary-row">
            <span>Subtotal</span>
            <span>{formatAUD(subtotal)}</span>
          </div>
          <div className="checkout-summary-row">
            <span>Shipping</span>
            <span>{shipping === 0 ? 'Free' : formatAUD(shipping)}</span>
          </div>
          {shipping > 0 && (
            <p className="checkout-summary-note">Free shipping on orders over {formatAUD(FREE_SHIPPING_THRESHOLD)}.</p>
          )}
          <div className="checkout-summary-row checkout-summary-total">
            <span>Total</span>
            <span>{formatAUD(total)}</span>
          </div>

          {method === 'payid' && (
            <div className="payid-info-box">
              <p className="eyebrow">Pay to</p>
              <p className="payid-id">{BUSINESS_PAYID}</p>
              <p className="payid-name">{BUSINESS_PAYID_NAME}</p>
              <p className="checkout-summary-note">A payment reference will be shown after you place your order — please include it so we can match your payment.</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function Field({ label, name, type = 'text', value, onChange, error, autoComplete, placeholder, idPrefix = '' }) {
  const id = `checkout-${idPrefix}${name}`;
  const errorId = `${id}-error`;
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error && <p id={errorId} className="form-field-error" role="alert">{error}</p>}
    </div>
  );
}
