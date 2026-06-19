import express from "express";
import { gscAuth, gscCallback, gscSync, gscStatus } from "../controllers/gsc.controllers.js";

const router = express.Router();

// ── GSC routes ────────────────────────────────────────────────────────────────
router.get("/auth",     gscAuth);
router.get("/callback", gscCallback);
router.get("/sync",     gscSync);
router.get("/status",   gscStatus);

export default router;