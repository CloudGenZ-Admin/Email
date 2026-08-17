import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT, 10),
  nodeEnv: process.env.NODE_ENV,
  isProduction: process.env.NODE_ENV === "production",

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    fromName: process.env.SMTP_FROM_NAME,
    fromEmail: process.env.SMTP_FROM_EMAIL,
  },

  defaultBcc: (process.env.DEFAULT_BCC || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean),

  rateLimit: {
    maxPerDay: parseInt(process.env.RATE_LIMIT_PER_DAY, 10),
  },

  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },

  corsOrigin: process.env.CORS_ORIGIN,
  trustProxy: process.env.TRUST_PROXY === "true",
};
