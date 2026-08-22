import { useState } from 'react';

const REASONS = [
  { value: '', label: 'Select a reason\u2026' },
  { value: 'custom', label: 'Request a custom commission' },
  { value: 'question', label: 'Question about a piece in the shop' },
  { value: 'repair', label: 'Question about a purchase' },
  { value: 'wholesale', label: 'Wholesale or press inquiry' },
  { value: 'other', label: 'Something else' },
];

export default function Contact() {
  const [reason, setReason] = useState('');
  const [imageName, setImageName] = useState('');
  const [sent, setSent] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    // TODO: wire this up to a real form handler — e.g. Formspree, Netlify
    // Forms, or your own backend. File uploads need a backend that accepts
    // multipart/form-data (Formspree and Netlify Forms both support this) —
    // this just simulates success for now.
    setSent(true);
  }

  const isCustom = reason === 'custom';

  return (
    <section className="container" style={{ position: 'relative', zIndex: 1, padding: 'var(--space-5) var(--space-3)', maxWidth: '60ch' }}>
      <p className="eyebrow">Contact & Requests</p>
      <h1 style={{ fontSize: 'var(--size-xl)' }}>I'd love to hear from you.</h1>
      <p>
        {/* Have a stone in mind, a question about a piece, or something else
        entirely? Let me know below and I'll follow up by email. */}
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
                onChange={(e) => setImageName(e.target.files?.[0]?.name || '')}
                style={{ ...inputStyle, padding: '0.5em' }}
              />
              {imageName && (
                <span style={{ fontSize: 'var(--size-xs)', color: 'var(--color-navy)' }}>
                  Selected: {imageName}
                </span>
              )}
            </label>
          )}

          <button type="submit" style={submitStyle}>
            Send {isCustom ? 'request' : 'message'}
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
