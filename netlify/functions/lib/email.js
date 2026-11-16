// Sends an email to the shop owner via Resend (same RESEND_API_KEY the contact
// form uses). See the note in send-contact-email.js about verifying a sending
// domain before real emails will deliver.

const TO_EMAIL = 'ed@edweatherheadjewellery.com';
const FROM_EMAIL = 'Ed Weatherhead Jewellery <ed@edweatherheadjewellery.com>';

// Returns { ok: true } or { ok: false, detail }. Throws only on network errors.
export async function sendOwnerEmail({ subject, text, replyTo }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject,
      text,
    }),
  });
  if (!res.ok) {
    return { ok: false, detail: await res.text() };
  }
  return { ok: true };
}
