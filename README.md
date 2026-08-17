# CloudGenz Multi-Website Form Submission & Email Backend

Centralized, high-performance Node.js REST API service designed to handle form submissions across multiple websites with built-in daily IP rate limiting, PurelyMail SMTP integration, and rich responsive HTML email notifications.

---

## Key Features

- **Multi-Website & Multi-Form Support**: Manage all websites and forms centrally in `config/websites.json`.
- **Daily Rate Limiting**: Enforces a strict limit of **2 submissions per IP per day** per form (configurable in `.env`).
- **PurelyMail SMTP Integration**: Preconfigured for `smtp.purelymail.com` (Port `465` SSL) with connection pooling.
- **Dynamic Field Support**: Accepts any number of custom form fields without touching backend code.
- **Configurable Timezones**: Set timezone per website or per form (e.g. `America/Toronto`, `IST`, `UTC`).
- **Automatic Reply-To**: Auto-detects the submitter's email address and sets the `Reply-To` header.
- **Global BCC**: Automatically BCCs `cloudgenz.it@gmail.com` on all form submissions.
- **Pure JSON REST API**: Clean responses `{ success: true, message: "..." }` for React, Next.js, and Vite.
- **Honeypot Spam Protection**: Silently ignores bot submissions using `_gotcha` or `honeypot` hidden fields.

---

## Directory Structure

```
f:\NodeEmail\
├── config\
│   └── websites.json           # All website definitions, form IDs, recipient emails, subjects
├── src\
│   ├── config\
│   │   └── env.js              # Environment variables & defaults loader
│   ├── middleware\
│   │   ├── rateLimiter.js      # Daily per-IP rate limiter (2 reqs/day)
│   │   └── errorHandler.js     # Clean JSON error handler
│   ├── routes\
│   │   └── submit.js           # POST /submit/:formId handler
│   ├── services\
│   │   ├── configService.js    # JSON configuration parser & hot-reloader
│   │   ├── mailService.js      # Nodemailer SMTP transporter & dispatcher
│   │   └── templateService.js  # Dynamic responsive HTML email builder
│   └── server.js               # Express application & server entry point
├── .env                        # Active environment secrets
├── .env.example                # Environment template
└── package.json
```

---

## Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server (Auto-Reload)
```bash
npm run dev
```

### 3. Start Production Server
```bash
npm start
```

---

## Environment Variables (`.env`)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | HTTP Port for the Node server | `3000` |
| `NODE_ENV` | Environment (`development` / `production`) | `development` |
| `SMTP_HOST` | PurelyMail SMTP Host | `smtp.purelymail.com` |
| `SMTP_PORT` | PurelyMail SMTP Port | `465` |
| `SMTP_SECURE` | SSL Enabled | `true` |
| `SMTP_USER` | SMTP Username | `notification@cloudgenz.com` |
| `SMTP_PASS` | SMTP App Password | `rqaklkxstebsdojizdco` |
| `SMTP_FROM_NAME` | Display name in From header | `Mission to Seafarers` |
| `SMTP_FROM_EMAIL` | Sender email address | `notification@cloudgenz.com` |
| `DEFAULT_BCC` | Global BCC recipient | `cloudgenz.it@gmail.com` |
| `RATE_LIMIT_PER_DAY` | Max allowed submissions per IP per day | `2` |
| `CORS_ORIGIN` | Allowed domains (`*` or comma-separated) | `*` |
| `TRUST_PROXY` | Enable if running behind Nginx / Cloudflare | `true` |

---

## Multi-Website Configuration (`config/websites.json`)

To add new websites or forms, simply update `config/websites.json`:

```json
{
  "websites": {
    "mtsc-toronto": {
      "name": "Mission to Seafarers Toronto",
      "timezone": "America/Toronto",
      "forms": {
        "toronto-contact": {
          "id": "toronto-contact",
          "name": "Contact Inquiry",
          "recipients": ["glutenfreepriest@gmail.com"],
          "subject": "New Contact Inquiry - MTSC Toronto",
          "successMessage": "Thank you! Your message has been sent successfully. We will be in touch shortly."
        }
      }
    }
  }
}
```

---

## Frontend Integration Example (React / Vite / TypeScript)

```tsx
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setIsSubmitting(true);

  const formData = new FormData(e.currentTarget);
  const payload = Object.fromEntries(formData.entries());
  const apiUrl = import.meta.env.VITE_FORM_API_URL || "http://localhost:3000";

  try {
    const response = await fetch(`${apiUrl}/submit/toronto-contact`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      toast({
        title: "Thank You",
        description: result.message,
      });
      e.currentTarget.reset();
    } else {
      toast({
        title: "Submission Failed",
        description: result.message || "Failed to submit form.",
        variant: "destructive",
      });
    }
  } catch (error) {
    toast({
      title: "Error",
      description: "Could not connect to the form submission service.",
      variant: "destructive",
    });
  } finally {
    setIsSubmitting(false);
  }
};
```

---

## API Endpoints

- **`POST /submit/:formId`** — Form submission endpoint. Returns `{ success: true, message: "..." }`.
- **`GET /health`** — Lightweight health check. Returns `{ status: "ok", timestamp: "..." }`.
