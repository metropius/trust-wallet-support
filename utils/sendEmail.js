/**
 * Zoho ZeptoMail REST email sender.
 * Uses ZOHO_CPAAS_API_KEY only. No SMTP/Nodemailer configuration or fallback.
 * Requires Node.js 18+ for the built-in fetch API.
 */

function clean(value) {
  return String(value || '').trim().replace(/^['"]|['"]$/g, '');
}

function getZohoConfig() {
  return {
    apiKey: clean(process.env.ZOHO_CPAAS_API_KEY),
    fromEmail: clean(process.env.ZOHO_FROM_EMAIL || process.env.FROM_EMAIL || 'noreply@pmtal.org'),
    fromName: clean(process.env.ZOHO_FROM_NAME || process.env.FROM_NAME || process.env.PLATFORM_NAME || 'Trust Wallet Support'),
    restBase: clean(process.env.ZOHO_EMAIL_API_URL || 'https://api.zeptomail.com/v1.1/email'),
  };
}

function zohoAuthHeader(apiKey) {
  const key = clean(apiKey);
  if (!key) return null;
  return /^Zoho-enczapikey\s+/i.test(key) ? key : `Zoho-enczapikey ${key}`;
}

function encodeAttachment(attachment) {
  if (!attachment) return null;
  let content = attachment.content;
  if (Buffer.isBuffer(content)) content = content.toString('base64');
  else if (typeof content === 'string') content = Buffer.from(content).toString('base64');
  else if (content != null) content = Buffer.from(content).toString('base64');
  if (!content) return null;
  return {
    name: String(attachment.filename || attachment.name || 'attachment'),
    content,
    mime_type: String(attachment.contentType || attachment.mimetype || 'application/octet-stream'),
  };
}

async function sendViaZoho({ to, subject, html, text, attachments, fromName }) {
  const config = getZohoConfig();
  const authorization = zohoAuthHeader(config.apiKey);
  if (!authorization) throw new Error('Zoho email is not configured: set ZOHO_CPAAS_API_KEY.');
  if (typeof fetch !== 'function') throw new Error('Zoho email requires Node.js 18 or newer (built-in fetch is unavailable).');

  const payload = {
    from: { address: config.fromEmail, name: clean(fromName) || config.fromName },
    to: [{ email_address: { address: to, name: '' } }],
    subject,
    htmlbody: html || `<p>${subject}</p>`,
  };
  if (text) payload.textbody = text;
  if (attachments && attachments.length) {
    const encoded = attachments.map(encodeAttachment).filter(Boolean);
    if (encoded.length) payload.attachments = encoded;
  }

  const response = await fetch(config.restBase, {
    method: 'POST',
    headers: { Authorization: authorization, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; }
  catch (error) { data = { raw }; }

  if (!response.ok) {
    console.error('Zoho ZeptoMail REST error:', data);
    const error = new Error(data?.message || data?.error?.message || `Zoho email send failed (HTTP ${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return {
    messageId: data?.data?.[0]?.message_id || data?.message_id || data?.request_id,
    provider: 'zoho_zeptomail_rest',
    data,
  };
}

/** await sendEmail({ email, subject, html, text, attachments }) */
async function sendEmail(options) {
  const to = String(options?.email || options?.to || '').trim();
  const subject = String(options?.subject || '').trim();
  const html = String(options?.html || '');
  const text = options?.text != null ? String(options.text) : undefined;
  const fromName = String(options?.fromName || '').trim();
  const attachments = Array.isArray(options?.attachments) ? options.attachments : [];
  if (!to) throw new Error('sendEmail: recipient email is required');
  if (!subject) throw new Error('sendEmail: subject is required');
  return sendViaZoho({ to, subject, html, text, attachments, fromName });
}

module.exports = sendEmail;
module.exports.getZohoConfig = getZohoConfig;
module.exports.zohoAuthHeader = zohoAuthHeader;
