const ADMIN_USER = 'YOSSIMAK';
const ADMIN_PASS = 'Smait764636';

exports.handler = async (event) => {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const requestedEmail = String(body.email || '').trim().toLowerCase();
  const adminEmail = String(process.env.ADMIN_RECOVERY_EMAIL || 'whaleradar@whaleradar.dev').trim().toLowerCase();
  if (!requestedEmail || requestedEmail !== adminEmail) {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RECOVERY_FROM_EMAIL || 'Whale Radar <whaleradar@whaleradar.dev>';
  if (!resendKey) {
    return { statusCode: 202, headers, body: JSON.stringify({ ok: true, configured: false }) };
  }

  const mail = {
    from: fromEmail,
    to: [adminEmail],
    subject: 'שחזור גישה לדשבורד Whale Clients',
    text: [
      'פרטי הכניסה לדשבורד הלקוחות:',
      '',
      `שם משתמש: ${ADMIN_USER}`,
      `סיסמה: ${ADMIN_PASS}`,
      '',
      'אם לא ביקשת שחזור סיסמה, מומלץ להחליף את הסיסמה בקובצי הפרויקט ולהעלות ZIP חדש.'
    ].join('\n')
  };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${resendKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(mail)
  });

  if (!response.ok) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'Email provider failed' }) };
  }

  return { statusCode: 200, headers, body: JSON.stringify({ ok: true, configured: true }) };
};
