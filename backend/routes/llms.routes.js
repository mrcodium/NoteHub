import express from "express";
import { getLlmsTxt, getLlmsFullTxt, bustLlmsCache } from "../controllers/llms.controllers.js";

const router = express.Router();

// Public LLM routes — no auth middleware required
router.get("/llms.txt", getLlmsTxt);
router.get("/llms-full.txt", getLlmsFullTxt);
router.delete("/llms/cache", bustLlmsCache);

export default router;
