// Sends a plain-text email through Brevo's REST API (Node 18+ has fetch built in).
// Needs BREVO_API_KEY and BREVO_SENDER_EMAIL (or EMAIL_FROM) in .env
const sendEmail = async ({ to, subject, text }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const rawSender = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM || '';
  const match = rawSender.match(/<([^>]+)>/); // accepts "Name <a@b.com>" too
  const senderEmail = (match ? match[1] : rawSender).trim();

  if (!apiKey || !senderEmail) {
    throw new Error('Email is not configured (BREVO_API_KEY / BREVO_SENDER_EMAIL missing)');
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Campus Connect', email: senderEmail },
      to: [{ email: to }],
      subject,
      textContent: text,
    }),
  });

  if (!res.ok) throw new Error(`Brevo error ${res.status}: ${await res.text()}`);
};

module.exports = sendEmail;