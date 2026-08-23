import { useState } from 'react';

// TODO: replace with your deployed function's URL once you've set up the
// Netlify site (see deployment steps) — it'll look like:
// https://your-site-name.netlify.app/.netlify/functions/send-contact-email
const CONTACT_ENDPOINT = 'https://incomparable-genie-e06daa.netlify.app/.netlify/functions/send-contact-email';

const REASONS = [
  { value: '', label: 'Select a reason\u2026' },
  { value: 'custom', label: 'Request a custom commission' },
  { value: 'question', label: 'Question about a piece in the shop' },
  { value: 'repair', label: 'Question about a purchase' },
  { value: 'wholesale', label: 'Wholesale or press inquiry' },
  { value: 'other', label: 'Something else' },
];

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]); // strip the data: URL prefix
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Contact() {
  const [reason, setReason] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isCustom = reason === 'custom';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const formData = new FormData(e.target);
    const reasonLabel = REASONS.find((r) => r.value === reason)?.label || reason;

    const payload = {
      name: formData.get('name'),
      email: formData.get('email'),
      reason: reasonLabel,
      message: formData.get('message'),
    };

    try {
      if (imageFile) {
        payload.imageBase64 = await fileToBase64(imageFile);
        payload.imageName = imageFile.name;
      }

      const res = await fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        // text/plain (rather than application/json) keeps this a CORS
        // "simple request", so the browser skips the OPTIONS preflight
        // entirely — sidesteps a Netlify quirk where the preflight route
        // 404s even though the function itself works fine. The function
        // still JSON.parses the body regardless of this header's value.
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Request failed');

      setSent(true);
    } catch (err) {
      setError("Something went wrong sending your message — please try again, or email me directly.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="container" style={{ position: 'relative', zIndex: 1, padding: 'var(--space-5) var(--space-3)', maxWidth: '60ch' }}>
      <p className="eyebrow">Contact & Requests</p>
      <h1 style={{ fontSize: 'var(--size-xl)' }}>I'd love to hear from you.</h1>
      <p>
        Do you have a specific design or stone in mind? A question about an item in the shop? Or any other questions or comments? Drop me a line and I'll follow up by email in the next three business days.
      </p>

      {sent ? (
        <p style={{ color: 'var(--color-navy)', fontWeight: 600 }}>
          Thanks — your message is in. I'll be in touch soon.
        </p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', marginTop: '2rem' }}>
          <label style={labelStyle}>
            Reason for contact
            <select
              name="reason"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={inputStyle}
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value} disabled={r.value === ''}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            Name
            <input type="text" name="name" required style={inputStyle} />
          </label>

          <label style={labelStyle}>
            Email
            <input type="email" name="email" required style={inputStyle} />
          </label>

          <label style={labelStyle}>
            {isCustom ? "Tell me about the piece you're picturing" : 'Message'}
            <textarea name="message" rows={5} required style={inputStyle} />
          </label>

          {isCustom && (
            <label style={labelStyle}>
              Reference photo (optional)
              <input
                type="file"
                name="image"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                style={{ ...inputStyle, padding: '0.5em' }}
              />
              {imageFile && (
                <span style={{ fontSize: 'var(--size-xs)', color: 'var(--color-navy)' }}>
                  Selected: {imageFile.name}
                </span>
              )}
            </label>
          )}

          {error && (
            <p style={{ color: 'var(--color-red)', fontSize: 'var(--size-sm)', margin: 0 }}>{error}</p>
          )}

          <button type="submit" disabled={submitting} style={{ ...submitStyle, opacity: submitting ? 0.7 : 1 }}>
            {submitting ? 'Sending\u2026' : `Send ${isCustom ? 'request' : 'message'}`}
          </button>
        </form>
      )}
    </section>
  );
}

const labelStyle = { display: 'grid', gap: '0.4rem', fontSize: 'var(--size-sm)' };

const inputStyle = {
  font: 'inherit',
  padding: '0.7em',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius)',
  background: 'var(--color-cards)',
  color: 'var(--color-navy)',
};

const submitStyle = {
  justifySelf: 'start',
  padding: '0.85em 1.75em',
  background: 'var(--color-navy-muted)',
  color: 'var(--color-cards)',
  border: 'none',
  borderRadius: 'var(--radius)',
  fontSize: 'var(--size-sm)',
};
