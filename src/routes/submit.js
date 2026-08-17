import express from "express";
import { submitForm } from "../controllers/submitController.js";
import { rateLimiterMiddleware } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/submit/:formId", rateLimiterMiddleware, submitForm);

export default router;
