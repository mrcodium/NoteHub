import express from "express";
import { handleUnsubscribe } from "../controller/unsubscribe.controller.js";

const router = express.Router();

// Public — no auth, anyone with a valid token can unsubscribe
router.get("/unsubscribe", handleUnsubscribe);

export default router;