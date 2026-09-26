import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'Ed Weatherhead Jewellery';

// TODO: this whole page is placeholder text. Replace each section with
// your actual policy before going live — customers see this link at
// checkout, and clear shipping/returns terms are expected practice for
// online stores in Australia.
export default function ShippingReturns() {
  return (
    <section className="container" style={{ position: 'relative', zIndex: 1, padding: 'var(--space-5) var(--space-3)' }}>
      <Helmet>
        <title>Shipping &amp; returns — {SITE_NAME}</title>
      </Helmet>

      <p className="eyebrow">Policies</p>
      <h1 style={{ fontSize: 'var(--size-xl)' }}>Shipping &amp; returns</h1>

      <h2>Shipping</h2>
      <p>Orders leave the studio within two business days.</p>
      <p>Parcels ship via Australia Post. Delivery typically takes 2-4 business days within the state of Victoria, and 3-6 business days to anywhere else in Australia. You can view estimated delivery times on <a href="https://auspost.com.au/parcels-mail/calculate-postage-delivery-times/#/" target="_blank">Australia Post's website</a> (enter the workshop's post code 3149 in the "From" field).</p>
      <p>All parcels from the workshop are insured at no additional cost. Please note: your parcel will require a signature on delivery.</p>
      <p>A shipping fee of $10.35 is charged on orders under $100. The shipping fee is waived on orders of $100 or more.</p>

      <h2>Returns &amp; exchanges</h2>
      <p>If an item is damaged when you receive it, please email the studio with photos of the item, its packaging, and the outer parcel wrapping, within five business days. If the item is deemed to have been damaged before arrival, we'll arrange to refund you for the item and any shipping costs. We reserve the right to request you return the item to us (at the studio's expense) before a refund can be issued.</p>
      <p>Change-of-mind returns are not available.</p>

      {/* <h2>Faulty items</h2> */}
      {/* <p>[Placeholder — describe how a customer should contact you about a fault or damage in transit, and what you'll do about it.]</p> */}

      <p>Nothing in this policy affects your rights under the Australian Consumer Law, which provide consumer guarantees that can't be excluded.</p>
    </section>
  );
}
