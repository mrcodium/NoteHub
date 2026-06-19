import { Router } from "express";

// Controllers
import {
  getGscAuthUrl,
  gscCallback,
  getGscStatus,
  disconnectGsc,
} from "../controllers/gsc.auth.controllers.js";

import {
  getSiteOverview,
  getNoteAnalyticsLive,
  getCachedAnalytics,
  getIndexingGaps,
} from "../controllers/gsc.analytics.controllers.js";

import {
  syncAllAnalytics,
  syncInspection,
  syncSingleNote,
  pingSitemap,
  getSitemaps,
} from "../controllers/gsc.sync.controllers.js";

const router = Router();

// ─── OAuth ────────────────────────────────────────────────────────────────────
// GET  /api/admin/gsc/auth          → redirect to Google consent
// GET  /api/admin/gsc/callback      → Google redirects here with ?code=
// GET  /api/admin/gsc/status        → is GSC connected?
// DELETE /api/admin/gsc/disconnect  → revoke + delete tokens
router.get   ("/auth",       getGscAuthUrl);
router.get   ("/callback",   gscCallback);
router.get   ("/status",     getGscStatus);
router.delete("/disconnect", disconnectGsc);

// ─── Read: Site-wide analytics ────────────────────────────────────────────────
// GET  /api/admin/gsc/overview          → totals, top pages, top queries, devices, daily trend
// GET  /api/admin/gsc/analytics         → paginated cached NoteAnalytics from DB
// GET  /api/admin/gsc/gaps              → not-indexed + zero-traffic notes
router.get("/overview",  getSiteOverview);
router.get("/analytics", getCachedAnalytics);
router.get("/gaps",      getIndexingGaps);

// ─── Read: Per-note (live GSC call) ──────────────────────────────────────────
// GET  /api/admin/gsc/note?slug=some-slug
router.get("/note", getNoteAnalyticsLive);

// ─── Sync: Trigger manually from admin panel or cron ─────────────────────────
// POST /api/admin/gsc/sync/analytics       → bulk sync all pages
// POST /api/admin/gsc/sync/inspection      → batch URL inspection
// POST /api/admin/gsc/sync/note/:slug      → sync one note (on publish)
router.post("/sync/analytics",    syncAllAnalytics);
router.post("/sync/inspection",   syncInspection);
router.post("/sync/note/:slug",   syncSingleNote);

// ─── Sitemaps ─────────────────────────────────────────────────────────────────
// GET  /api/admin/gsc/sitemaps     → list all submitted sitemaps
// POST /api/admin/gsc/sitemap/ping → ping Google to re-crawl sitemap
router.get ("/sitemaps",      getSitemaps);
router.post("/sitemap/ping",  pingSitemap);

export default router;
