import { config } from "../config/env.js";

class DailyRateLimiter {
  constructor() {
    this.submissions = new Map(); // key: "ip:formId:YYYY-MM-DD", value: count
    this.lastCleanupDate = this.getTodayDateString();

    // Periodic cleanup of older date entries once every hour
    setInterval(() => this.cleanupOldEntries(), 60 * 60 * 1000);
  }

  getTodayDateString() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  getClientIp(req) {
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
    return req.ip || req.connection?.remoteAddress || "127.0.0.1";
  }

  cleanupOldEntries() {
    const today = this.getTodayDateString();
    if (today === this.lastCleanupDate) return;

    for (const key of this.submissions.keys()) {
      if (!key.endsWith(today)) {
        this.submissions.delete(key);
      }
    }
    this.lastCleanupDate = today;
  }

  checkLimit(clientIp, formId) {
    const today = this.getTodayDateString();
    const key = `${clientIp}:${formId}:${today}`;
    const maxPerDay = config.rateLimit.maxPerDay;

    const currentCount = this.submissions.get(key) || 0;
    const remaining = Math.max(0, maxPerDay - currentCount);

    if (currentCount >= maxPerDay) {
      return {
        allowed: false,
        count: currentCount,
        limit: maxPerDay,
        remaining: 0,
      };
    }

    return {
      allowed: true,
      count: currentCount,
      limit: maxPerDay,
      remaining,
    };
  }

  recordSubmission(clientIp, formId) {
    const today = this.getTodayDateString();
    const key = `${clientIp}:${formId}:${today}`;
    const currentCount = this.submissions.get(key) || 0;
    this.submissions.set(key, currentCount + 1);
  }
}

const limiter = new DailyRateLimiter();

export const rateLimiterMiddleware = (req, res, next) => {
  const clientIp = limiter.getClientIp(req);
  const formId = req.params.formId || req.body.formId || req.query.formId || "general";

  const status = limiter.checkLimit(clientIp, formId);

  res.setHeader("X-RateLimit-Limit", status.limit);
  res.setHeader("X-RateLimit-Remaining", status.remaining);

  if (!status.allowed) {
    const message = `Submission limit reached. You can only submit this form ${status.limit} times per day. Please try again tomorrow.`;

    return res.status(429).json({
      success: false,
      message,
    });
  }

  // Attach record method to response or request so we only increment on successful processing
  req.recordRateLimit = () => limiter.recordSubmission(clientIp, formId);
  req.clientIp = clientIp;

  next();
};
