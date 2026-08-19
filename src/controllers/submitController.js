import { Form } from "../models/Form.js";
import { SubmissionLog } from "../models/SubmissionLog.js";
import { mailService } from "../services/mailService.js";

// Helper to save submission log to database
async function saveDbLog({
  formId,
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
      clientIp,
      userAgent,
      referrer,
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

    // 1. Look up form configuration directly from MySQL database
    const form = await Form.findByPk(formId);

    if (!form) {
      console.warn(`[Submit] Unknown formId requested: '${formId}'`);
      return res.status(404).json({
        success: false,
        message: `Form with ID '${formId}' is not registered in the database.`,
      });
    }

    // 2. Check honeypot field for spam prevention
    if (req.body._gotcha || req.body.honeypot) {
      console.warn(`[Submit] Bot detected via honeypot for form ${formId} from IP ${clientIp}`);

      await saveDbLog({
        formId,
        clientIp,
        userAgent,
        referrer,
        formData: req.body,
        status: "BLOCKED_SPAM",
        errorMessage: "Blocked by honeypot trap",
      });

      return res.status(200).json({ success: true });
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
      form,
      formData,
      metadata,
    });

    // 6. Record rate limit counter
    if (typeof req.recordRateLimit === "function") {
      req.recordRateLimit();
    }

    // 7. Log successful submission in MySQL Database
    await saveDbLog({
      formId: form.id,
      clientIp,
      userAgent,
      referrer,
      formData,
      status: "SENT",
      emailMessageId: mailResult?.messageId,
    });

    // 8. Return success
    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    // Log failed submission in database
    await saveDbLog({
      formId,
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
