import { config } from "../config/env.js";
import { SubmissionLog } from "../models/SubmissionLog.js";

const submissions = new Map(); // key: "ip:formId:YYYY-MM-DD", value: count
let lastCleanupDate = getTodayDateString();

function getTodayDateString() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || "127.0.0.1";
}

function cleanupOldEntries() {
  const today = getTodayDateString();
  if (today === lastCleanupDate) return;

  for (const key of submissions.keys()) {
    if (!key.endsWith(today)) {
      submissions.delete(key);
    }
  }
  lastCleanupDate = today;
}

// Periodic cleanup of older date entries once every hour
setInterval(cleanupOldEntries, 60 * 60 * 1000);

function checkLimit(clientIp, formId) {
  const today = getTodayDateString();
  const key = `${clientIp}:${formId}:${today}`;
  const maxPerDay = config.rateLimit.maxPerDay;

  const currentCount = submissions.get(key) || 0;
  const remaining = Math.max(0, maxPerDay - currentCount);

  if (currentCount >= maxPerDay) {
    return { allowed: false, count: currentCount, limit: maxPerDay, remaining: 0 };
  }

  return { allowed: true, count: currentCount, limit: maxPerDay, remaining };
}

function recordSubmission(clientIp, formId) {
  const today = getTodayDateString();
  const key = `${clientIp}:${formId}:${today}`;
  const currentCount = submissions.get(key) || 0;
  submissions.set(key, currentCount + 1);
}

export function rateLimiterMiddleware(req, res, next) {
  const clientIp = getClientIp(req);
  const formId = req.params.formId || req.body.formId || req.query.formId || "general";

  const status = checkLimit(clientIp, formId);

  res.setHeader("X-RateLimit-Limit", status.limit);
  res.setHeader("X-RateLimit-Remaining", status.remaining);

  if (!status.allowed) {
    const message = `Submission limit reached. You can only submit this form ${status.limit} times per day. Please try again tomorrow.`;

    SubmissionLog.create({
      formId,
      siteKey: req.body?.siteId || null,
      clientIp,
      userAgent: req.headers["user-agent"] || null,
      referrer: req.headers["referer"] || req.headers["origin"] || null,
      formData: req.body || {},
      status: "BLOCKED_RATE_LIMIT",
      errorMessage: `Exceeded daily rate limit of ${status.limit} requests`,
    }).catch((err) => console.warn(`[Database] Could not log rate limit block: ${err.message}`));

    return res.status(429).json({
      success: false,
      message,
    });
  }

  req.recordRateLimit = () => recordSubmission(clientIp, formId);
  req.clientIp = clientIp;

  next();
}
