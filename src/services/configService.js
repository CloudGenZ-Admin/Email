import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.resolve(__dirname, "../../config/websites.json");

let websites = {};
const formsIndex = new Map();

function rebuildIndex() {
  formsIndex.clear();
  for (const [siteKey, siteData] of Object.entries(websites)) {
    if (!siteData.forms) continue;

    for (const [formKey, formConfig] of Object.entries(siteData.forms)) {
      const formId = formConfig.id || formKey;
      const normalized = {
        ...formConfig,
        id: formId,
        siteKey,
        siteName: siteData.name || siteKey,
        recipients: formConfig.recipients?.length ? formConfig.recipients : [],
        subject: formConfig.subject || `New Submission: ${formConfig.name || formId} (${siteData.name || siteKey})`,
        timezone: formConfig.timezone || siteData.timezone || "America/Toronto",
        successMessage: formConfig.successMessage || "Thank you! Your message has been sent successfully.",
      };

      formsIndex.set(formId.toLowerCase(), normalized);
      formsIndex.set(`${siteKey.toLowerCase()}:${formKey.toLowerCase()}`, normalized);
    }
  }
}

export function loadConfig() {
  try {
    if (!fs.existsSync(configPath)) {
      console.warn(`[Config] Config file not found at ${configPath}`);
      websites = {};
      return;
    }

    const fileData = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(fileData);
    websites = parsed.websites || {};
    rebuildIndex();
  } catch (error) {
    console.error("[Config] Error reading config/websites.json:", error.message);
  }
}

export function getForm(formId, siteKey = null) {
  if (!formId) return null;

  if (siteKey) {
    const compositeKey = `${siteKey.toLowerCase()}:${formId.toLowerCase()}`;
    if (formsIndex.has(compositeKey)) {
      return formsIndex.get(compositeKey);
    }
  }

  return formsIndex.get(formId.toLowerCase()) || null;
}

export function getAllForms() {
  return Array.from(formsIndex.values());
}

export function getAllWebsites() {
  return websites;
}

// Initial load
loadConfig();

// Hot reload on file changes
try {
  fs.watchFile(configPath, { interval: 1000 }, (curr, prev) => {
    if (curr.mtime !== prev.mtime) {
      console.log("[Config] Detected change in websites.json, hot-reloading...");
      loadConfig();
    }
  });
} catch (err) {
  console.warn("[Config] Watcher error:", err.message);
}

export const configService = {
  getForm,
  getAllForms,
  getAllWebsites,
  loadConfig,
};
