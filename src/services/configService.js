import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "../config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.resolve(__dirname, "../../config/websites.json");

class ConfigService {
  constructor() {
    this.websites = {};
    this.formsIndex = new Map();
    this.loadConfig();

    // Auto-reload on any changes to config/websites.json without restarting server
    try {
      fs.watchFile(configPath, { interval: 1000 }, (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
          console.log("[ConfigService] Detected change in websites.json, hot-reloading configuration...");
          this.loadConfig();
        }
      });
    } catch (err) {
      console.warn("[ConfigService] Could not set up file watch on websites.json:", err.message);
    }
  }

  loadConfig() {
    try {
      if (!fs.existsSync(configPath)) {
        console.warn(`[ConfigService] Config file not found at ${configPath}, creating empty default.`);
        this.websites = { websites: {} };
        return;
      }

      const fileData = fs.readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(fileData);
      this.websites = parsed.websites || {};
      this.rebuildIndex();
      console.log(`[ConfigService] Successfully loaded configuration for ${Object.keys(this.websites).length} websites and ${this.formsIndex.size} forms.`);
    } catch (error) {
      console.error("[ConfigService] Error reading config/websites.json:", error);
    }
  }

  rebuildIndex() {
    this.formsIndex.clear();
    for (const [siteKey, siteData] of Object.entries(this.websites)) {
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

        this.formsIndex.set(formId.toLowerCase(), normalized);
        // Also register under siteKey:formKey
        this.formsIndex.set(`${siteKey.toLowerCase()}:${formKey.toLowerCase()}`, normalized);
      }
    }
  }

  getForm(formId, siteKey = null) {
    if (!formId) return null;

    if (siteKey) {
      const compositeKey = `${siteKey.toLowerCase()}:${formId.toLowerCase()}`;
      if (this.formsIndex.has(compositeKey)) {
        return this.formsIndex.get(compositeKey);
      }
    }

    return this.formsIndex.get(formId.toLowerCase()) || null;
  }

  getAllForms() {
    return Array.from(this.formsIndex.values());
  }

  getAllWebsites() {
    return this.websites;
  }
}

export const configService = new ConfigService();
