require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const Email = require('./models/Email');
const sendEmail = require('./utils/sendEmail');
const { buildEmailHtml } = require('./utils/emailTemplates');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer for logo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.png';
    cb(null, 'logo-' + unique + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase()) ||
      allowed.test(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('Only image files are allowed for logo'));
  },
});

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- MongoDB ----------
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trustwallet';
mongoose
  .connect(mongoUri)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    console.log('Server will still start; email history will fail until MongoDB is available.');
  });

// ---------- API Routes ----------

// List / search emails (mailing history)
app.get('/api/emails', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    let filter = {};
    if (q) {
      filter = {
        $or: [
          { title: { $regex: q, $options: 'i' } },
          { recipient: { $regex: q, $options: 'i' } },
          { 'messages.subject': { $regex: q, $options: 'i' } },
          { 'messages.body': { $regex: q, $options: 'i' } },
        ],
      };
    }
    const emails = await Email.find(filter)
      .sort({ lastMessageAt: -1 })
      .limit(100)
      .lean();
    res.json({ success: true, data: emails });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single email thread
app.get('/api/emails/:id', async (req, res) => {
  try {
    const email = await Email.findById(req.params.id).lean();
    if (!email) return res.status(404).json({ success: false, error: 'Email not found' });
    res.json({ success: true, data: email });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send new email (creates thread)
app.post('/api/emails/send', upload.single('logo'), async (req, res) => {
  try {
    const {
      recipient,
      subject,
      message,
      template = 'default',
      buttonText = '',
      buttonUrl = '',
      hiddenLinkText = '',
      hiddenLinkUrl = '',
      footer = '',
    } = req.body;

    if (!recipient || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: 'Recipient, subject and message are required',
      });
    }

    let logoUrl = '';
    if (req.file) {
      logoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    const html = buildEmailHtml({
      template,
      subject,
      message,
      logoUrl,
      buttonText,
      buttonUrl,
      hiddenLinkText,
      hiddenLinkUrl,
      footer,
    });

    let sendResult;
    try {
      sendResult = await sendEmail({
        email: recipient,
        subject,
        html,
        text: message,
      });
    } catch (sendErr) {
      console.error('Send failed:', sendErr.message);
      // Still save as failed
      const failedDoc = await Email.create({
        recipient,
        title: subject,
        status: 'failed',
        lastMessageAt: new Date(),
        messages: [
          {
            subject,
            body: message,
            html,
            template,
            logoUrl,
            buttonText,
            buttonUrl,
            hiddenLinkText,
            hiddenLinkUrl,
            footer,
            direction: 'outbound',
            messageId: null,
            provider: 'none',
            sentAt: new Date(),
          },
        ],
      });
      return res.status(502).json({
        success: false,
        error: sendErr.message || 'Failed to send email',
        data: failedDoc,
      });
    }

    const doc = await Email.create({
      recipient,
      title: subject,
      status: sendResult.provider === 'none' ? 'pending' : 'sent',
      lastMessageAt: new Date(),
      messages: [
        {
          subject,
          body: message,
          html,
          template,
          logoUrl,
          buttonText,
          buttonUrl,
          hiddenLinkText,
          hiddenLinkUrl,
          footer,
          direction: 'outbound',
          messageId: sendResult.messageId || null,
          provider: sendResult.provider || 'zoho',
          sentAt: new Date(),
        },
      ],
    });

    res.json({
      success: true,
      message: 'Email sent successfully',
      data: doc,
      provider: sendResult.provider,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reply on existing thread
app.post('/api/emails/:id/reply', upload.single('logo'), async (req, res) => {
  try {
    const emailDoc = await Email.findById(req.params.id);
    if (!emailDoc) {
      return res.status(404).json({ success: false, error: 'Email thread not found' });
    }

    const {
      subject,
      message,
      template = 'default',
      buttonText = '',
      buttonUrl = '',
      hiddenLinkText = '',
      hiddenLinkUrl = '',
      footer = '',
    } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const replySubject = subject || `Re: ${emailDoc.title}`;

    let logoUrl = '';
    if (req.file) {
      logoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    const html = buildEmailHtml({
      template,
      subject: replySubject,
      message,
      logoUrl,
      buttonText,
      buttonUrl,
      hiddenLinkText,
      hiddenLinkUrl,
      footer,
    });

    let sendResult;
    try {
      sendResult = await sendEmail({
        email: emailDoc.recipient,
        subject: replySubject,
        html,
        text: message,
      });
    } catch (sendErr) {
      return res.status(502).json({
        success: false,
        error: sendErr.message || 'Failed to send reply',
      });
    }

    emailDoc.messages.push({
      subject: replySubject,
      body: message,
      html,
      template,
      logoUrl,
      buttonText,
      buttonUrl,
      hiddenLinkText,
      hiddenLinkUrl,
      footer,
      direction: 'outbound',
      messageId: sendResult.messageId || null,
      provider: sendResult.provider || 'zoho',
      sentAt: new Date(),
    });
    emailDoc.lastMessageAt = new Date();
    emailDoc.status = sendResult.provider === 'none' ? 'pending' : 'sent';
    await emailDoc.save();

    res.json({
      success: true,
      message: 'Reply sent successfully',
      data: emailDoc,
      provider: sendResult.provider,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete email thread
app.delete('/api/emails/:id', async (req, res) => {
  try {
    const deleted = await Email.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Contact form from index.html (optional backend endpoint)
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, error: 'All fields required' });
    }
    // Store as inbound-style note in history (optional)
    await Email.create({
      recipient: email,
      title: `[Contact] ${subject}`,
      status: 'sent',
      lastMessageAt: new Date(),
      messages: [
        {
          subject: `[Contact from ${name}] ${subject}`,
          body: message,
          html: `<p><strong>From:</strong> ${name} &lt;${email}&gt;</p><p>${message}</p>`,
          template: 'default',
          direction: 'inbound',
          sentAt: new Date(),
        },
      ],
    });
    res.json({ success: true, message: 'Message received' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SPA-style routes
app.get('/email', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'email.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler for multer etc.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Server error',
  });
});

app.listen(PORT, () => {
  console.log(`Trust Wallet Support server running on http://localhost:${PORT}`);
  console.log(`Email admin panel: http://localhost:${PORT}/email`);
});
