import express from "express";
import { bustSitemapCache, getSitemap } from "../controller/sitemap.controller.js";

const router = express.Router();

// Public — no auth middleware
router.get("/sitemap.xml", getSitemap);
router.delete("/sitemap/cache", bustSitemapCache);


export default router;