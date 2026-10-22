# Trust Wallet Support — Full Application

Static Trust Wallet Support marketing site + Node.js Express server with MongoDB Atlas and Zoho (ZeptoMail) email admin panel.

## Features

- Serves the original `index.html` site (hero, about, testimonials, contact) with all CSS/JS intact
- Contact form posts to `/api/contact` and is stored in mailing history
- **Email Admin** at `/email`:
  - Compose form: recipient, subject, message, logo upload, 3 templates (Default / Modern / Minimal)
  - Optional hidden link (text in message becomes a subtle link)
  - Optional CTA button with URL
  - Optional footer content
  - Templates auto-adjust when logo / button / footer are omitted
  - Mailing history as searchable email cards
  - Click a card → thread detail + send another message on the same recipient
- Email provider: **Zoho / ZeptoMail only** (SMTP preferred, REST fallback)

## Quick start

```bash
cd trust-wallet-app
cp .env.example .env
# Edit .env with your MongoDB Atlas URI and Zoho credentials
npm install
npm start
```

Open:

- Site: http://localhost:3000/
- Email admin: http://localhost:3000/email

## Environment variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default 3000) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `ZOHO_SMTP_HOST` | `smtp.zeptomail.com` |
| `ZOHO_SMTP_PORT` | `465` |
| `ZOHO_SMTP_USER` | `emailapikey` |
| `ZOHO_SMTP_PASS` | Your ZeptoMail SMTP password |
| `ZOHO_FROM_EMAIL` | Verified sender address |
| `ZOHO_FROM_NAME` | Sender display name |
| `ZOHO_CPAAS_API_KEY` | Optional REST API key fallback |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name (logo uploads) |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

Logo images are uploaded to Cloudinary (folder `trust-wallet-support/logos`) and the secure URL is embedded in the email HTML.

## Project structure

```
trust-wallet-app/
├── server.js              # Express app + API routes
├── package.json
├── .env.example
├── models/Email.js        # MongoDB schema (threads + messages)
├── utils/
│   ├── sendEmail.js       # Zoho SMTP / REST sender
│   ├── emailTemplates.js  # Default / Modern / Minimal HTML builders
│   └── cloudinary.js      # Logo upload to Cloudinary
└── public/
    ├── index.html         # Marketing site
    ├── email.html         # Admin email panel
    ├── css/
    ├── js/
    ├── images/
    └── uploads/           # Uploaded logos
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/emails?q=` | List / search mailing history |
| GET | `/api/emails/:id` | Get one thread |
| POST | `/api/emails/send` | Send new email (multipart: logo + fields) |
| POST | `/api/emails/:id/reply` | Reply on thread |
| DELETE | `/api/emails/:id` | Delete thread |
| POST | `/api/contact` | Public contact form |

## Notes

- Logo uploads are stored under `public/uploads/` and referenced by absolute URL in the HTML email.
- If Zoho is not configured, sends are saved as `pending` / `dev-skip` so you can still test the UI and history.
- Bird.com integration was intentionally omitted; only Zoho is used.
