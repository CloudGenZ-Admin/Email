/**
 * Converts camelCase, snake_case, kebab-case, or prefix-tagged keys into human-readable Title Case labels.
 */
export function formatFieldLabel(key) {
  if (!key) return "Field";

  // If key is like entry.1234567, replace with readable placeholder or keep
  if (key.startsWith("entry.")) {
    return `Form Field (${key})`;
  }

  // Remove common prefixes like cname -> name, cemail -> email, if single letter prefix
  let cleaned = key;
  if (/^[a-z][A-Z]/.test(key)) {
    cleaned = key;
  } else if (/^c[a-z]{3,}/i.test(key) && ["cname", "cemail", "cphone", "cinterest", "cmessage"].includes(key.toLowerCase())) {
    cleaned = key.substring(1);
  }

  // Convert snake_case or kebab-case to spaces
  cleaned = cleaned.replace(/[-_]+/g, " ");

  // Insert space before capital letters (camelCase to words)
  cleaned = cleaned.replace(/([a-z])([A-Z])/g, "$1 $2");

  // Capitalize each word
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Format field values for display (handles strings, arrays, booleans, objects)
 */
export function formatFieldValue(val) {
  if (val === null || val === undefined || val === "") {
    return '<span style="color: #94a3b8; font-style: italic;">(Not provided)</span>';
  }

  if (Array.isArray(val)) {
    if (val.length === 0) return '<span style="color: #94a3b8; font-style: italic;">(None selected)</span>';
    return `<ul style="margin: 0; padding-left: 20px; color: #1e293b;">${val
      .map(item => `<li style="margin-bottom: 4px;">${escapeHtml(String(item))}</li>`)
      .join("")}</ul>`;
  }

  if (typeof val === "boolean") {
    return val ? "Yes" : "No";
  }

  if (typeof val === "object") {
    return `<pre style="margin:0; font-family: monospace; font-size: 12px; background: #f1f5f9; padding: 8px; border-radius: 4px;">${escapeHtml(
      JSON.stringify(val, null, 2)
    )}</pre>`;
  }

  // Preserve newlines for multiline text
  const escaped = escapeHtml(String(val));
  return escaped.replace(/\n/g, "<br/>");
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Builds the modern HTML email template
 */
export function buildSubmissionEmailHtml({
  formConfig,
  formData,
  metadata: { clientIp, timestamp, userAgent, referrer },
}) {
  const siteName = formConfig.siteName || "Website";
  const formName = formConfig.name || formConfig.id;

  // Resolve timezone (supports IANA timezones like "America/Toronto", "Asia/Kolkata", "UTC", or shortcuts like "IST", "EST")
  const tzShortcuts = {
    IST: "Asia/Kolkata",
    EST: "America/New_York",
    EDT: "America/Toronto",
    PST: "America/Los_Angeles",
    PDT: "America/Los_Angeles",
    CST: "America/Chicago",
    UTC: "UTC",
    GMT: "GMT",
  };

  const rawTz = formConfig.timezone || "America/Toronto";
  const resolvedTz = tzShortcuts[rawTz.toUpperCase()] || rawTz;

  let dateFormatted = "";
  try {
    dateFormatted = new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeStyle: "medium",
      timeZone: resolvedTz,
      timeZoneName: "short",
    }).format(new Date(timestamp));
  } catch (err) {
    dateFormatted = `${new Date(timestamp).toUTCString()} (UTC)`;
  }

  // Filter out internal system keys from the display table
  const ignoredKeys = ["formid", "form_id", "siteid", "site_id", "_next", "_redirect", "g-recaptcha-response", "honeypot"];
  const fields = Object.entries(formData).filter(
    ([key]) => !ignoredKeys.includes(key.toLowerCase())
  );

  const tableRowsHtml = fields
    .map(([key, value], idx) => {
      const label = formatFieldLabel(key);
      const formattedValue = formatFieldValue(value);
      const rowBg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";

      return `
        <tr style="background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 16px; font-weight: 600; color: #334155; width: 32%; vertical-align: top; font-size: 14px;">
            ${escapeHtml(label)}
          </td>
          <td style="padding: 12px 16px; color: #0f172a; font-size: 14px; line-height: 1.5; vertical-align: top;">
            ${formattedValue}
          </td>
        </tr>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Form Submission</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 650px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0f2744 0%, #1a365d 100%); padding: 28px 32px; color: #ffffff;">
      <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #f97316; margin-bottom: 6px;">
        ${escapeHtml(siteName)}
      </div>
      <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; line-height: 1.3;">
        ${escapeHtml(formName)}
      </h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #cbd5e1;">
        Received on ${dateFormatted}
      </p>
    </div>

    <!-- Submission Details Content -->
    <div style="padding: 28px 32px;">
      <h2 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
        Submission Details
      </h2>

      <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
      <p style="margin: 0 0 4px 0;">This email was sent via CloudGenz Form Notification Service.</p>
      <p style="margin: 0;">Powered by <strong style="color: #64748b;">CloudGenZ Technologies Pvt Ltd</strong></p>
    </div>

  </div>
</body>
</html>
  `;
}

/**
 * Builds clean plain-text fallback
 */
export function buildSubmissionEmailText({
  formConfig,
  formData,
}) {
  const siteName = formConfig.siteName || "Website";
  const formName = formConfig.name || formConfig.id;
  const ignoredKeys = ["formid", "form_id", "siteid", "site_id", "_next", "_redirect", "g-recaptcha-response", "honeypot"];

  let text = `=== NEW FORM SUBMISSION ===\n\n`;
  text += `Website: ${siteName}\n`;
  text += `Form: ${formName}\n\n`;
  text += `--- SUBMISSION DATA ---\n\n`;

  for (const [key, value] of Object.entries(formData)) {
    if (ignoredKeys.includes(key.toLowerCase())) continue;
    const label = formatFieldLabel(key);
    const formattedVal = Array.isArray(value) ? value.join(", ") : String(value);
    text += `${label}: ${formattedVal}\n`;
  }

  text += `\n=========================\n`;
  text += `Sent via CloudGenz Form Service\n`;

  return text;
}
