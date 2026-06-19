/**
 * linkGraph.routes.js
 *
 * All routes are admin-only.
 * Mount in index.js:  app.use("/api/admin", adminRouter)
 * Mount in admin.routes.js by importing and using this router, or
 * add the three routes below directly into admin.routes.js.
 *
 * Final URLs:
 *   POST /api/admin/link-graph/crawl    — start crawl (SSE)
 *   GET  /api/admin/link-graph/latest   — last completed crawl
 *   GET  /api/admin/link-graph/history  — list of crawl runs
 */

import express from "express";
import { protectRoute, adminOnly } from "../middleware/protectRoute.middleware.js";
import {
  startCrawl,
  getLatestCrawl,
  getCrawlHistory,
} from "../controllers/linkGraph.controllers.js";

const router = express.Router();

// Start a new crawl — responds with SSE stream
router.post("/link-graph/crawl", startCrawl);

// Fetch the most recent completed crawl (graph data for reagraph)
router.get("/link-graph/latest", getLatestCrawl);

// List crawl history (for "last crawl ran at…" UI)
router.get("/link-graph/history", getCrawlHistory);

export default router;