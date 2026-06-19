import express from "express";
import { bustSitemapCache, getSitemap } from "../controllers/sitemap.controllers.js";

const router = express.Router();

// Public — no auth middleware
router.get("/sitemap.xml", getSitemap);
router.delete("/sitemap/cache", bustSitemapCache);


export default router;