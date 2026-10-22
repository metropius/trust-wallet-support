/**
 * Zoho / ZeptoMail email sender
 * Prefers SMTP (agent SMTP panel), falls back to REST API if configured.
 */
const nodemailer = require('nodemailer');

function clean(v) {
  return String(v || '')
    .trim()
    .replace(/^["']|["']$/g, '');
}

function getZohoConfig() {
  const apiKey = clean(process.env.ZOHO_CPAAS_API_KEY || process.env.ZOHO_EMAIL_API_KEY);
  const fromEmail = clean(
    process.env.ZOHO_FROM_EMAIL ||
      process.env.FROM_EMAIL ||
      'noreply@pmtal.org'
  );
  const fromName = clean(
    process.env.ZOHO_FROM_NAME ||
      process.env.FROM_NAME ||
      process.env.PLATFORM_NAME ||
      'Trust Wallet Support'
  );
  const smtpHost = clean(process.env.ZOHO_SMTP_HOST || 'smtp.zeptomail.com');
  const smtpPort = Number(process.env.ZOHO_SMTP_PORT || 465);
  const smtpUser = clean(process.env.ZOHO_SMTP_USER || 'emailapikey');
  const smtpPass = clean(process.env.ZOHO_SMTP_PASS || process.env.ZOHO_SMTP_PASSWORD);
  const restBase = clean(
    process.env.ZOHO_EMAIL_API_URL || 'https://api.zeptomail.com/v1.1/email'
  );
  return { apiKey, fromEmail, fromName, smtpHost, smtpPort, smtpUser, smtpPass, restBase };
}

function zohoAuthHeader(apiKey) {
  let key = clean(apiKey);
  if (!key) return null;
  if (!/^Zoho-enczapikey\s+/i.test(key)) {
    key = `Zoho-enczapikey ${key}`;
  }
  return key;
}

async function sendViaZohoSmtp({ to, subject, html, text, fromEmail, fromName, smtp, attachments }) {
  const transporter = nodemailer.createTransport({
    host: smtp.smtpHost,
    port: smtp.smtpPort,
    secure: smtp.smtpPort === 465,
    auth: {
      user: smtp.smtpUser,
      pass: smtp.smtpPass,
    },
  });

  const mail = {
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    text: text || undefined,
    html: html || `<p>${subject}</p>`,
  };

  if (attachments && attachments.length) {
    mail.attachments = attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType || a.mimetype || 'application/octet-stream',
      cid: a.cid || undefined,
    }));
  }

  const info = await transporter.sendMail(mail);
  console.log('Zoho SMTP accepted:', info.messageId);
  return {
    messageId: info.messageId,
    provider: 'zoho_smtp',
    data: info,
  };
}

async function sendViaZohoRest({ to, subject, html, text, fromEmail, fromName, apiKey, restBase }) {
  const auth = zohoAuthHeader(apiKey);
  if (!auth) {
    throw new Error('ZOHO_CPAAS_API_KEY not set for Zoho email REST');
  }

  const payload = {
    from: { address: fromEmail, name: fromName },
    to: [{ email_address: { address: to, name: '' } }],
    subject,
    htmlbody: html || `<p>${subject}</p>`,
  };
  if (text) payload.textbody = text;

  console.log('Zoho email REST:', { url: restBase, to, from: fromEmail });
  const res = await fetch(restBase, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch (_) {
    data = { raw };
  }

  if (!res.ok) {
    console.error('Zoho Email REST error:', data);
    const err = new Error(
      data?.message || data?.error?.message || 'Zoho email send failed'
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return {
    messageId: data?.data?.[0]?.message_id || data?.message_id || data?.request_id,
    provider: 'zoho_rest',
    data,
  };
}

async function sendViaZoho({ to, subject, html, text, attachments }) {
  const z = getZohoConfig();

  if (z.smtpPass) {
    try {
      return await sendViaZohoSmtp({
        to,
        subject,
        html,
        text,
        fromEmail: z.fromEmail,
        fromName: z.fromName,
        smtp: z,
        attachments: attachments || [],
      });
    } catch (e) {
      console.error('Zoho SMTP failed, trying REST:', e.message);
    }
  }

  if (z.apiKey) {
    return sendViaZohoRest({
      to,
      subject,
      html,
      text,
      fromEmail: z.fromEmail,
      fromName: z.fromName,
      apiKey: z.apiKey,
      restBase: z.restBase,
    });
  }

  console.warn('Zoho email not configured (need ZOHO_SMTP_PASS or ZOHO_CPAAS_API_KEY)');
  return { id: 'dev-skip', provider: 'none', messageId: 'dev-skip-' + Date.now() };
}

/**
 * await sendEmail({ email, subject, html, text, attachments })
 */
async function sendEmail(options) {
  const attachments = options?.attachments || [];
  const to = String(options?.email || options?.to || '').trim();
  const subject = String(options?.subject || '').trim();
  const html = String(options?.html || '');
  const text = options?.text != null ? String(options.text) : undefined;

  if (!to) throw new Error('sendEmail: recipient email is required');
  if (!subject) throw new Error('sendEmail: subject is required');

  return sendViaZoho({ to, subject, html, text, attachments });
}

module.exports = sendEmail;
module.exports.getZohoConfig = getZohoConfig;
