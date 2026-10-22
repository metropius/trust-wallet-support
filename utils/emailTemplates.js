/**
 * Build HTML email body from form data and selected template.
 * Templates auto-adjust when logo / button / footer / hidden link are omitted.
 */

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function processMessageBody(message, hiddenLinkText, hiddenLinkUrl) {
  let body = escapeHtml(message).replace(/\n/g, '<br>');
  if (hiddenLinkText && hiddenLinkUrl) {
    const safeText = escapeHtml(hiddenLinkText);
    const safeUrl = escapeHtml(hiddenLinkUrl);
    // Replace first occurrence of the exact text with a hidden-looking link
    const re = new RegExp(safeText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (re.test(body)) {
      body = body.replace(
        re,
        `<a href="${safeUrl}" style="color:inherit;text-decoration:none;border-bottom:1px dotted #999;" target="_blank" rel="noopener">${safeText}</a>`
      );
    } else {
      body += ` <a href="${safeUrl}" style="color:inherit;text-decoration:none;border-bottom:1px dotted #999;" target="_blank" rel="noopener">${safeText}</a>`;
    }
  }
  return body;
}

function logoBlock(logoUrl) {
  if (!logoUrl) return '';
  return `
    <tr>
      <td align="center" style="padding:24px 0 8px;">
        <img src="${escapeHtml(logoUrl)}" alt="Logo" width="120" style="max-width:120px;height:auto;display:block;border:0;" />
      </td>
    </tr>`;
}

function buttonBlock(buttonText, buttonUrl) {
  if (!buttonText || !buttonUrl) return '';
  return `
    <tr>
      <td align="center" style="padding:24px 0 8px;">
        <a href="${escapeHtml(buttonUrl)}" target="_blank" rel="noopener"
           style="display:inline-block;background:#0D7CEB;color:#ffffff;font-family:Inter,Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:8px;">
          ${escapeHtml(buttonText)}
        </a>
      </td>
    </tr>`;
}

function footerBlock(footer) {
  if (!footer) return '';
  return `
    <tr>
      <td style="padding:24px 32px 16px;font-family:Inter,Arial,sans-serif;font-size:12px;line-height:1.5;color:#888888;border-top:1px solid #eeeeee;">
        ${escapeHtml(footer).replace(/\n/g, '<br>')}
      </td>
    </tr>`;
}

function buildTemplateDefault({ subject, messageHtml, logoUrl, buttonText, buttonUrl, footer }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          ${logoBlock(logoUrl)}
          <tr>
            <td style="padding:16px 32px 8px;font-family:Inter,Arial,sans-serif;font-size:20px;font-weight:700;color:#111111;">
              ${escapeHtml(subject)}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 16px;font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.65;color:#333333;">
              ${messageHtml}
            </td>
          </tr>
          ${buttonBlock(buttonText, buttonUrl)}
          ${footerBlock(footer)}
          <tr>
            <td style="padding:12px 32px 24px;font-family:Inter,Arial,sans-serif;font-size:11px;color:#aaaaaa;text-align:center;">
              Trust Wallet Support &middot; Independent support service
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildTemplateModern({ subject, messageHtml, logoUrl, buttonText, buttonUrl, footer }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0b1220;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b1220;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:linear-gradient(180deg,#141c2e 0%,#0f1624 100%);border-radius:16px;overflow:hidden;border:1px solid #1e2a44;">
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#0D7CEB,#33c3ff);"></td>
          </tr>
          ${logoBlock(logoUrl)}
          <tr>
            <td style="padding:12px 32px 4px;font-family:Inter,Arial,sans-serif;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#5b8def;">
              Trust Wallet Support
            </td>
          </tr>
          <tr>
            <td style="padding:4px 32px 16px;font-family:Inter,Arial,sans-serif;font-size:22px;font-weight:700;color:#f0f4ff;">
              ${escapeHtml(subject)}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 20px;font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.7;color:#c5d0e6;">
              ${messageHtml}
            </td>
          </tr>
          ${buttonText && buttonUrl ? `
          <tr>
            <td align="center" style="padding:8px 32px 24px;">
              <a href="${escapeHtml(buttonUrl)}" target="_blank" rel="noopener"
                 style="display:inline-block;background:linear-gradient(90deg,#0D7CEB,#1a9fff);color:#ffffff;font-family:Inter,Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:999px;">
                ${escapeHtml(buttonText)}
              </a>
            </td>
          </tr>` : ''}
          ${footer ? `
          <tr>
            <td style="padding:20px 32px;font-family:Inter,Arial,sans-serif;font-size:12px;line-height:1.5;color:#6b7a99;border-top:1px solid #1e2a44;">
              ${escapeHtml(footer).replace(/\n/g, '<br>')}
            </td>
          </tr>` : ''}
          <tr>
            <td style="padding:12px 32px 28px;font-family:Inter,Arial,sans-serif;font-size:11px;color:#4a5568;text-align:center;">
              Trust Wallet Support &middot; Not officially affiliated with Trust Wallet
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildTemplateMinimal({ subject, messageHtml, logoUrl, buttonText, buttonUrl, footer }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;padding:40px 24px;">
    ${logoUrl ? `
    <tr>
      <td style="padding-bottom:24px;">
        <img src="${escapeHtml(logoUrl)}" alt="Logo" width="80" style="max-width:80px;height:auto;display:block;border:0;" />
      </td>
    </tr>` : ''}
    <tr>
      <td style="font-family:Georgia,serif;font-size:22px;font-weight:400;color:#111;padding-bottom:16px;">
        ${escapeHtml(subject)}
      </td>
    </tr>
    <tr>
      <td style="font-family:Georgia,serif;font-size:16px;line-height:1.75;color:#333;padding-bottom:24px;">
        ${messageHtml}
      </td>
    </tr>
    ${buttonText && buttonUrl ? `
    <tr>
      <td style="padding-bottom:28px;">
        <a href="${escapeHtml(buttonUrl)}" target="_blank" rel="noopener"
           style="font-family:Inter,Arial,sans-serif;font-size:14px;font-weight:600;color:#0D7CEB;text-decoration:underline;">
          ${escapeHtml(buttonText)} →
        </a>
      </td>
    </tr>` : ''}
    ${footer ? `
    <tr>
      <td style="font-family:Inter,Arial,sans-serif;font-size:12px;line-height:1.5;color:#888;border-top:1px solid #eee;padding-top:20px;">
        ${escapeHtml(footer).replace(/\n/g, '<br>')}
      </td>
    </tr>` : ''}
  </table>
</body>
</html>`;
}

function buildEmailHtml(options) {
  const {
    template = 'default',
    subject = '',
    message = '',
    logoUrl = '',
    buttonText = '',
    buttonUrl = '',
    hiddenLinkText = '',
    hiddenLinkUrl = '',
    footer = '',
  } = options;

  const messageHtml = processMessageBody(message, hiddenLinkText, hiddenLinkUrl);
  const payload = { subject, messageHtml, logoUrl, buttonText, buttonUrl, footer };

  switch ((template || 'default').toLowerCase()) {
    case 'modern':
      return buildTemplateModern(payload);
    case 'minimal':
      return buildTemplateMinimal(payload);
    case 'default':
    default:
      return buildTemplateDefault(payload);
  }
}

module.exports = { buildEmailHtml, processMessageBody };
