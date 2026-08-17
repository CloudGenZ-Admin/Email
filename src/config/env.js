import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  
  smtp: {
    host: process.env.SMTP_HOST || "smtp.purelymail.com",
    port: parseInt(process.env.SMTP_PORT || "465", 10),
    secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
    user: process.env.SMTP_USER || "notification@cloudgenz.com",
    pass: process.env.SMTP_PASS || "rqaklkxstebsdojizdco",
    fromName: process.env.SMTP_FROM_NAME || "CloudGenz Forms",
    fromEmail: process.env.SMTP_FROM_EMAIL || "notification@cloudgenz.com",
  },
  
  defaultBcc: (process.env.DEFAULT_BCC || "cloudgenz.it@gmail.com")
    .split(",")
    .map(email => email.trim())
    .filter(Boolean),
    
  rateLimit: {
    maxPerDay: parseInt(process.env.RATE_LIMIT_PER_DAY || "2", 10),
  },
  
  corsOrigin: process.env.CORS_ORIGIN || "*",
  trustProxy: process.env.TRUST_PROXY === "true",
};
