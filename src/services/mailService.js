import nodemailer from "nodemailer";
import { config } from "../config/env.js";
import { buildSubmissionEmailHtml, buildSubmissionEmailText } from "./templateService.js";

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});

// Verify connection pool on start
transporter.verify().then(() => {
  console.log("[MailService] PurelyMail SMTP connection pool ready.");
}).catch((err) => {
  console.error("[MailService] SMTP connection error:", err.message);
});

// Helper to auto-detect submitter email from form values
function detectSubmitterEmail(formData) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const commonKeys = [
    "email", "cemail", "contactemail", "user_email", "sender_email", "contact",
    "entry.608487628", "entry.1615868162", "entry.840255252", "entry.176043329"
  ];

  for (const key of commonKeys) {
    const val = formData[key] || formData[key.toLowerCase()];
    if (val && typeof val === "string" && emailRegex.test(val.trim())) {
      return val.trim();
    }
  }

  for (const val of Object.values(formData)) {
    if (typeof val === "string" && emailRegex.test(val.trim())) {
      return val.trim();
    }
  }

  return null;
}

export async function sendFormNotification({ formConfig, formData, metadata }) {
  const recipients = formConfig.recipients || [];
  if (recipients.length === 0) {
    throw new Error(`No recipient email address configured for form: ${formConfig.id}`);
  }

  const submitterEmail = detectSubmitterEmail(formData);
  const htmlContent = buildSubmissionEmailHtml({ formConfig, formData, metadata });
  const textContent = buildSubmissionEmailText({ formConfig, formData });

  const mailOptions = {
    from: `"${formConfig.siteName}" <${config.smtp.fromEmail}>`,
    to: recipients.join(", "),
    // bcc: config.defaultBcc,
    subject: formConfig.subject || `New Form Submission: ${formConfig.name || formConfig.id}`,
    text: textContent,
    html: htmlContent,
    replyTo: submitterEmail || undefined,
  };

  console.log(`[MailService] Sending email for form '${formConfig.id}' to: ${recipients.join(", ")}`);
  const info = await transporter.sendMail(mailOptions);
  console.log(`[MailService] Email sent successfully! MessageId: ${info.messageId}`);

  return {
    success: true,
    messageId: info.messageId,
    recipients,
  };
}

export const mailService = {
  sendFormNotification,
};
