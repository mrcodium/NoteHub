import express from "express";
import { adminOnly } from "../middleware/protectRoute.middleware.js";
import { bustSitemapCache, getSitemap } from "../controller/sitemap.controller.js";

const router = express.Router();

// Public — no auth middleware
router.get("/sitemap.xml", getSitemap);
router.delete("/sitemap/cache",adminOnly,  bustSitemapCache);

export default router;