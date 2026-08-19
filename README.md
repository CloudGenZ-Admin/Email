# CloudGenz Multi-Website Form Submission & Email Backend

Centralized, high-performance Node.js REST API service designed to handle form submissions across multiple websites with built-in daily IP rate limiting, PurelyMail SMTP integration, MySQL database persistence via Sequelize, and rich responsive HTML email notifications.

---

## Key Features

- **Database-Driven Form Configuration**: Manage all forms in the MySQL `forms` table (`id`, `name`, `recipients`, `timezone`).
- **Submission & Spam Audit Logging**: All submissions, timestamps, submitter IPs, and spam blocks are stored in MySQL (`submission_logs`).
- **Daily Rate Limiting**: Enforces a strict limit of **2 submissions per IP per day** per form (configurable in `.env`).
- **PurelyMail SMTP Integration**: Preconfigured for `smtp.purelymail.com` (Port `465` SSL) with connection pooling.
- **Dynamic Field Support**: Accepts any number of custom form fields without touching backend code.
- **Automatic Reply-To**: Auto-detects the submitter's email address and sets the `Reply-To` header.
- **Pure JSON REST API**: Clean response `{ success: true }` for React, Next.js, and Vite.
- **Honeypot Spam Protection**: Silently traps bot submissions using `_gotcha` or `honeypot` hidden fields.

---

## Directory Structure

```
f:\NodeEmail\
├── src\
│   ├── config\
│   │   ├── db.js               # Sequelize MySQL connection & auto-sync
│   │   └── env.js              # Environment variables loader
│   ├── controllers\
│   │   └── submitController.js # Handles validation, DB lookup, email dispatch & logging
│   ├── middleware\
│   │   ├── rateLimiter.js      # Daily per-IP rate limiter (2 reqs/day)
│   │   └── errorHandler.js     # Clean JSON error handler
│   ├── models\
│   │   ├── Form.js             # MySQL 'forms' table schema
│   │   └── SubmissionLog.js    # MySQL 'submission_logs' table schema
│   ├── routes\
│   │   └── submit.js           # POST /submit/:formId route
│   ├── services\
│   │   ├── mailService.js      # PurelyMail SMTP sender
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

## Database Tables

### 1. `forms`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `VARCHAR(100)` | Unique form ID (e.g. `toronto-contact`) |
| `name` | `VARCHAR(255)` | Human-readable form name (e.g. `Contact Inquiry`) |
| `recipients` | `JSON` | Array of recipient emails (e.g. `["admin@example.com"]`) |
| `timezone` | `VARCHAR(64)` | Timezone for formatting (e.g. `America/Toronto`, `IST`) |

### 2. `submission_logs`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `BIGINT` | Auto-increment primary key |
| `formId` | `VARCHAR(100)` | Unique form ID (Indexed) |
| `clientIp` | `VARCHAR(64)` | Submitter IP address (Indexed) |
| `userAgent` | `TEXT` | Browser user-agent |
| `referrer` | `TEXT` | Website URL where form was submitted |
| `formData` | `JSON` | Full submitted key-value payload |
| `status` | `ENUM` | `SENT`, `FAILED`, `BLOCKED_RATE_LIMIT`, `BLOCKED_SPAM` (Indexed) |
| `errorMessage` | `TEXT` | Error details if failed |
| `emailMessageId` | `VARCHAR(255)` | SMTP Message-ID receipt |
| `createdAt` | `DATETIME` | Submission timestamp (Indexed) |

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
        description: "Your message has been sent successfully.",
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

- **`POST /submit/:formId`** — Form submission endpoint. Returns `{ success: true }`.
- **`GET /health`** — Lightweight health check. Returns `{ status: "ok", timestamp: "..." }`.
