// Netlify Function — receives the contact form's POST body and sends an
// email via Resend. This is the only place your Resend API key is used;
// it lives in Netlify's environment variables, never in frontend code.
//
// Setup checklist (see the deployment steps for the full walkthrough):
//   1. Set RESEND_API_KEY in this Netlify site's environment variables.
//   2. Replace TO_EMAIL below with your real inbox address.
//   3. Once you've verified a domain in Resend, replace FROM_EMAIL with
//      an address on that domain (e.g. "Your Jewellery Business
//      <hello@yourdomain.com>"). Until then, the default
//      "onboarding@resend.dev" sender only delivers to the email address
//      your Resend account is registered with — good enough for testing,
//      not for real customer submissions.
//   4. Once deployed, copy this function's URL into
//      src/pages/Contact.jsx (the CONTACT_ENDPOINT constant).
//   5. Replace ALLOWED_ORIGIN below with your real site's domain once
//      it's live, so only your site can call this function.

const TO_EMAIL = 'you@yourdomain.com'; // TODO: replace with your real inbox
const FROM_EMAIL = 'Your Jewellery Business <onboarding@resend.dev>'; // TODO: update after domain verification
const ALLOWED_ORIGIN = '*'; // TODO: replace with e.g. 'https://yourdomain.com' once live

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid request body.' }) };
  }

  const { name, email, reason, message, imageBase64, imageName } = data;

  if (!name || !email || !reason || !message) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing required fields.' }),
    };
  }

  const payload = {
    from: FROM_EMAIL,
    to: [TO_EMAIL],
    reply_to: email,
    subject: `New inquiry (${reason}) from ${name}`,
    text: `From: ${name} <${email}>\nReason: ${reason}\n\n${message}`,
  };

  // Attachments are capped conservatively here (~5MB base64) since Netlify
  // Functions have a request body size limit — large photos may fail.
  if (imageBase64 && imageName) {
    payload.attachments = [{ filename: imageName, content: imageBase64 }];
  }

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!resendRes.ok) {
      const detail = await resendRes.text();
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Resend rejected the request.', detail }),
      };
    }

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Unexpected server error.' }),
    };
  }
};
