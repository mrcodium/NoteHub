import express from "express";
import { handleBrevoWebhook } from "../controller/brevoWebhook.controller.js";

const router = express.Router();

// Public endpoint — auth handled inside controller via token header
router.post("/webhooks/brevo", handleBrevoWebhook);

export default router;