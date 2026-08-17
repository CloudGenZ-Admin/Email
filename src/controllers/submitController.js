import { configService } from "../services/configService.js";
import { mailService } from "../services/mailService.js";
import { SubmissionLog } from "../models/SubmissionLog.js";

// Helper to detect submitter's email from submitted fields
function detectEmail(formData) {
  if (!formData) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const [key, val] of Object.entries(formData)) {
    if (typeof val === "string" && (key.toLowerCase().includes("email") || emailRegex.test(val.trim()))) {
      if (emailRegex.test(val.trim())) return val.trim();
    }
  }
  return null;
}

// Helper to detect submitter's name from submitted fields
function detectName(formData) {
  if (!formData) return null;
  for (const [key, val] of Object.entries(formData)) {
    if (typeof val === "string" && ["name", "full_name", "fullname", "cname", "contactname", "first_name"].includes(key.toLowerCase())) {
      return val.trim();
    }
  }
  return null;
}

// Helper to save submission log to database
async function saveDbLog({
  formId,
  siteKey,
  siteName,
  clientIp,
  userAgent,
  referrer,
  formData,
  status,
  errorMessage,
  emailMessageId,
}) {
  try {
    await SubmissionLog.create({
      formId,
      siteKey,
      siteName,
      clientIp,
      userAgent,
      referrer,
      submitterEmail: detectEmail(formData),
      submitterName: detectName(formData),
      formData,
      status,
      errorMessage,
      emailMessageId,
    });
  } catch (err) {
    console.warn(`[Database] Could not save submission log: ${err.message}`);
  }
}

// Main Submit Controller
export async function submitForm(req, res, next) {
  const formId = req.params.formId;
  const siteKey = req.body.siteId || null;
  const clientIp = req.clientIp || req.ip;
  const userAgent = req.headers["user-agent"];
  const referrer = req.headers["referer"] || req.headers["origin"];

  try {
    if (!formId) {
      return res.status(400).json({
        success: false,
        message: "Missing form identifier. Please provide a valid formId in URL.",
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
      console.warn(`[Submit] Bot detected via honeypot for form ${formId} from IP ${clientIp}`);

      await saveDbLog({
        formId,
        siteKey: formConfig.siteKey,
        siteName: formConfig.siteName,
        clientIp,
        userAgent,
        referrer,
        formData: req.body,
        status: "BLOCKED_SPAM",
        errorMessage: "Blocked by honeypot trap",
      });

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
      clientIp,
      timestamp: new Date().toISOString(),
      userAgent,
      referrer,
    };

    // 5. Dispatch email via PurelyMail
    const mailResult = await mailService.sendFormNotification({
      formConfig,
      formData,
      metadata,
    });

    // 6. Record rate limit counter
    if (typeof req.recordRateLimit === "function") {
      req.recordRateLimit();
    }

    // 7. Log successful submission in MySQL Database
    await saveDbLog({
      formId: formConfig.id,
      siteKey: formConfig.siteKey,
      siteName: formConfig.siteName,
      clientIp,
      userAgent,
      referrer,
      formData,
      status: "SENT",
      emailMessageId: mailResult?.messageId,
    });

    // 8. Return clean JSON response
    const successMessage = formConfig.successMessage || "Thank you! Your message has been sent successfully.";
    return res.status(200).json({
      success: true,
      message: successMessage,
    });
  } catch (error) {
    // Log failed submission in database
    await saveDbLog({
      formId,
      siteKey,
      clientIp,
      userAgent,
      referrer,
      formData: req.body,
      status: "FAILED",
      errorMessage: error.message,
    });

    next(error);
  }
}
