import express from "express";
import { configService } from "../services/configService.js";
import { mailService } from "../services/mailService.js";
import { rateLimiterMiddleware } from "../middleware/rateLimiter.js";

const router = express.Router();

async function handleSubmission(req, res, next) {
  try {
    const formId = req.params.formId || req.body.formId || req.query.formId;
    const siteKey = req.body.siteId || req.query.siteId || null;

    if (!formId) {
      return res.status(400).json({
        success: false,
        message: "Missing form identifier. Please provide a valid formId.",
      });
    }

    // 1. Look up form configuration from websites.json
    const formConfig = configService.getForm(formId, siteKey);

    if (!formConfig) {
      console.warn(`[Submit] Unknown formId requested: '${formId}'`);
      return res.status(404).json({
        success: false,
        message: `Form with ID '${formId}' is not registered in websites.json.`,
      });
    }

    // 2. Check honeypot field for spam prevention
    if (req.body._gotcha || req.body.honeypot) {
      console.warn(`[Submit] Bot detected via honeypot for form ${formId}`);
      return res.json({ success: true, message: "Thank you for your submission." });
    }

    // 3. Clean submitted fields
    const formData = { ...req.body };
    delete formData.formId;
    delete formData.siteId;

    if (Object.keys(formData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No form fields were submitted.",
      });
    }

    // 4. Capture metadata
    const metadata = {
      clientIp: req.clientIp || req.ip || "127.0.0.1",
      timestamp: new Date().toISOString(),
      userAgent: req.headers["user-agent"] || "unknown",
      referrer: req.headers["referer"] || req.headers["origin"] || "",
    };

    // 5. Dispatch email via PurelyMail
    await mailService.sendFormNotification({
      formConfig,
      formData,
      metadata,
    });

    // 6. Record rate limit counter
    if (typeof req.recordRateLimit === "function") {
      req.recordRateLimit();
    }

    // 7. Return clean JSON response
    const successMessage = formConfig.successMessage || "Thank you! Your message has been sent successfully.";
    return res.status(200).json({
      success: true,
      message: successMessage,
    });
  } catch (error) {
    next(error);
  }
}

// Routes
router.post("/submit/:formId", rateLimiterMiddleware, handleSubmission);

export default router;
