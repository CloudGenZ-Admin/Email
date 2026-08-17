import nodemailer from "nodemailer";
import { config } from "../config/env.js";
import { buildSubmissionEmailHtml, buildSubmissionEmailText } from "./templateService.js";

class MailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
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

    this.verifyConnection();
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log("[MailService] PurelyMail SMTP connection pool ready.");
    } catch (error) {
      console.error("[MailService] Failed to initialize SMTP connection:", error.message);
    }
  }

  /**
   * Attempts to detect user's email address from submitted form keys
   */
  detectSubmitterEmail(formData) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // Priority keys
    const commonEmailKeys = [
      "email",
      "cemail",
      "contactemail",
      "user_email",
      "sender_email",
      "contact",
      "entry.608487628",
      "entry.1615868162",
      "entry.840255252",
      "entry.176043329",
      "entry.419020187",
      "entry.1472187123",
      "entry.1277424146"
    ];

    for (const key of commonEmailKeys) {
      const val = formData[key] || formData[key.toLowerCase()];
      if (val && typeof val === "string" && emailRegex.test(val.trim())) {
        return val.trim();
      }
    }

    // Fallback: search all values
    for (const val of Object.values(formData)) {
      if (typeof val === "string" && emailRegex.test(val.trim())) {
        return val.trim();
      }
    }

    return null;
  }

  async sendFormNotification({ formConfig, formData, metadata }) {
    const recipients = formConfig.recipients || [];
    if (recipients.length === 0) {
      throw new Error(`No recipient email address configured for form: ${formConfig.id}`);
    }

    const submitterEmail = this.detectSubmitterEmail(formData);
    const htmlContent = buildSubmissionEmailHtml({ formConfig, formData, metadata });
    const textContent = buildSubmissionEmailText({ formConfig, formData, metadata });

    const mailOptions = {
      from: `"${formConfig.siteName || config.smtp.fromName}" <${config.smtp.fromEmail}>`,
      to: recipients.join(", "),
      // bcc: config.defaultBcc,
      subject: formConfig.subject || `New Form Submission: ${formConfig.name || formConfig.id}`,
      text: textContent,
      html: htmlContent,
      replyTo: submitterEmail || undefined,
    };

    console.log(`[MailService] Sending email for form '${formConfig.id}' to: ${recipients.join(", ")}`);
    const info = await this.transporter.sendMail(mailOptions);
    console.log(`[MailService] Email sent successfully! MessageId: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
      recipients,
    };
  }
}

export const mailService = new MailService();
