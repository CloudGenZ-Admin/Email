import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config/env.js";
import { connectDB } from "./config/db.js";
import "./models/Form.js";
import "./models/SubmissionLog.js";
import submitRouter from "./routes/submit.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

// Initialize Database Connection
connectDB();

// Trust proxy if running behind Nginx / Cloudflare
if (config.trustProxy) {
  app.set("trust proxy", 1);
}

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// CORS configuration
const corsOptions = {
  origin: config.corsOrigin === "*" ? true : config.corsOrigin.split(",").map(o => o.trim()),
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
  credentials: true,
};
app.use(cors(corsOptions));

// HTTP Request Logging
if (!config.isProduction) {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Body parsing middleware
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Mount form submission routes
app.use(submitRouter);

// Catch 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} does not exist.`,
  });
});

// Error handling middleware
app.use(errorHandler);

// Start Server
const server = app.listen(config.port, () => {
  console.log(`[Server] Running on http://localhost:${config.port}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[Server] SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("[Server] Closed out remaining connections.");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("[Server] SIGINT received. Shutting down gracefully...");
  server.close(() => {
    console.log("[Server] Closed out remaining connections.");
    process.exit(0);
  });
});

export default app;
