import NoteAnalytics from "../models/NoteAnalytics.model.js";
import {
  getSearchConsoleService,
  SITE_URL,
  today,
  daysAgo,
} from "../config/gsc.client.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_START = "2024-01-01";

// Merge device-dimension rows into a { desktop, mobile, tablet } object
const parseDeviceRows = (rows = []) => {
  const devices = {
    desktop: { clicks: 0, impressions: 0 },
    mobile:  { clicks: 0, impressions: 0 },
    tablet:  { clicks: 0, impressions: 0 },
  };
  for (const row of rows) {
    const device = row.keys[0]?.toLowerCase();
    if (devices[device]) {
      devices[device].clicks      = row.clicks      ?? 0;
      devices[device].impressions = row.impressions ?? 0;
    }
  }
  return devices;
};

// ─── GET /api/admin/gsc/overview ──────────────────────────────────────────────
// Site-wide totals + top pages + top queries
export const getSiteOverview = async (req, res) => {
  try {
    const sc = await getSearchConsoleService();
    const start = req.query.start || daysAgo(90);
    const end   = req.query.end   || daysAgo(3); // GSC data is delayed 24-72h

    const [pagesRes, queriesRes, deviceRes, dateRes] = await Promise.all([
      // Top pages
      sc.searchanalytics.query({
        siteUrl: SITE_URL,
        requestBody: {
          startDate: start,
          endDate: end,
          dimensions: ["page"],
          rowLimit: 50,
        },
      }),
      // Top queries
      sc.searchanalytics.query({
        siteUrl: SITE_URL,
        requestBody: {
          startDate: start,
          endDate: end,
          dimensions: ["query"],
          rowLimit: 50,
        },
      }),
      // Device breakdown
      sc.searchanalytics.query({
        siteUrl: SITE_URL,
        requestBody: {
          startDate: start,
          endDate: end,
          dimensions: ["device"],
          rowLimit: 10,
        },
      }),
      // Daily trend (last 30 days for chart)
      sc.searchanalytics.query({
        siteUrl: SITE_URL,
        requestBody: {
          startDate: daysAgo(30),
          endDate: end,
          dimensions: ["date"],
          rowLimit: 30,
        },
      }),
    ]);

    const topPages   = pagesRes.data.rows   ?? [];
    const topQueries = queriesRes.data.rows  ?? [];
    const deviceRows = deviceRes.data.rows   ?? [];
    const dateRows   = dateRes.data.rows     ?? [];

    // Site-wide totals from pages roll-up
    const totals = topPages.reduce(
      (acc, r) => {
        acc.clicks      += r.clicks      ?? 0;
        acc.impressions += r.impressions ?? 0;
        return acc;
      },
      { clicks: 0, impressions: 0 },
    );

    res.json({
      dateRange: { start, end },
      totals: {
        ...totals,
        // weighted average position across all pages
        avgPosition:
          topPages.length > 0
            ? topPages.reduce((s, r) => s + (r.position ?? 0), 0) / topPages.length
            : null,
      },
      topPages: topPages.map((r) => ({
        url:         r.keys[0],
        clicks:      r.clicks,
        impressions: r.impressions,
        ctr:         r.ctr,
        position:    r.position,
      })),
      topQueries: topQueries.map((r) => ({
        query:       r.keys[0],
        clicks:      r.clicks,
        impressions: r.impressions,
        ctr:         r.ctr,
        position:    r.position,
      })),
      devices:  parseDeviceRows(deviceRows),
      dailyTrend: dateRows.map((r) => ({
        date:        r.keys[0],
        clicks:      r.clicks,
        impressions: r.impressions,
        ctr:         r.ctr,
        position:    r.position,
      })),
    });
  } catch (err) {
    console.error("[GSC] getSiteOverview error:", err);
    res.status(err.status || 500).json({ error: err.message });
  }
};

// ─── GET /api/admin/gsc/note?slug=some-slug ───────────────────────────────────
// Per-note analytics from GSC (live call, not cached)
export const getNoteAnalyticsLive = async (req, res) => {
  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: "slug is required." });

  try {
    const sc  = await getSearchConsoleService();
    const url = `${SITE_URL}notes/${slug}`;
    const start = req.query.start || daysAgo(90);
    const end   = req.query.end   || daysAgo(3);

    const pageFilter = {
      dimensionFilterGroups: [
        {
          filters: [
            { dimension: "page", operator: "equals", expression: url },
          ],
        },
      ],
    };

    const [queriesRes, deviceRes, dateRes] = await Promise.all([
      // Top queries for this specific page
      sc.searchanalytics.query({
        siteUrl: SITE_URL,
        requestBody: {
          startDate: start,
          endDate: end,
          dimensions: ["query"],
          rowLimit: 20,
          ...pageFilter,
        },
      }),
      // Device breakdown for this page
      sc.searchanalytics.query({
        siteUrl: SITE_URL,
        requestBody: {
          startDate: start,
          endDate: end,
          dimensions: ["device"],
          rowLimit: 5,
          ...pageFilter,
        },
      }),
      // Daily trend for this page
      sc.searchanalytics.query({
        siteUrl: SITE_URL,
        requestBody: {
          startDate: daysAgo(30),
          endDate: end,
          dimensions: ["date"],
          rowLimit: 30,
          ...pageFilter,
        },
      }),
    ]);

    const queryRows  = queriesRes.data.rows ?? [];
    const deviceRows = deviceRes.data.rows  ?? [];
    const dateRows   = dateRes.data.rows    ?? [];

    // Aggregate totals from query rows
    const totals = queryRows.reduce(
      (acc, r) => {
        acc.clicks      += r.clicks      ?? 0;
        acc.impressions += r.impressions ?? 0;
        return acc;
      },
      { clicks: 0, impressions: 0, ctr: 0, position: 0 },
    );

    // Also pull cached NoteAnalytics if it exists
    const cached = await NoteAnalytics.findOne({ noteSlug: slug }).lean();

    res.json({
      slug,
      url,
      dateRange: { start, end },
      live: {
        totals: {
          ...totals,
          ctr:      queryRows[0]?.ctr      ?? 0,
          position: queryRows[0]?.position ?? 0,
        },
        topQueries: queryRows.map((r) => ({
          query:       r.keys[0],
          clicks:      r.clicks,
          impressions: r.impressions,
          ctr:         r.ctr,
          position:    r.position,
        })),
        devices:    parseDeviceRows(deviceRows),
        dailyTrend: dateRows.map((r) => ({
          date:        r.keys[0],
          clicks:      r.clicks,
          impressions: r.impressions,
          position:    r.position,
        })),
      },
      // Return cached inspection data alongside live search analytics
      inspection: cached?.inspection ?? null,
      lastAnalyticsSync: cached?.lastAnalyticsSync ?? null,
    });
  } catch (err) {
    console.error("[GSC] getNoteAnalyticsLive error:", err);
    res.status(err.status || 500).json({ error: err.message });
  }
};

// ─── GET /api/admin/gsc/analytics ─────────────────────────────────────────────
// Bulk analytics from NoteAnalytics collection (from last sync — no GSC call)
export const getCachedAnalytics = async (req, res) => {
  try {
    const {
      sort  = "clicks",   // clicks | impressions | position | ctr
      order = "desc",
      limit = 50,
      skip  = 0,
    } = req.query;

    const SORT_FIELDS = {
      clicks:      "gsc.clicks",
      impressions: "gsc.impressions",
      position:    "gsc.position",
      ctr:         "gsc.ctr",
    };

    const sortField = SORT_FIELDS[sort] || "gsc.clicks";
    const sortDir   = order === "asc" ? 1 : -1;

    const [docs, total] = await Promise.all([
      NoteAnalytics.find({})
        .sort({ [sortField]: sortDir })
        .skip(Number(skip))
        .limit(Number(limit))
        .lean(),
      NoteAnalytics.countDocuments(),
    ]);

    res.json({ total, data: docs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/admin/gsc/gaps ──────────────────────────────────────────────────
// Notes with zero GSC data (no impressions) or not yet indexed
export const getIndexingGaps = async (req, res) => {
  try {
    const notIndexed = await NoteAnalytics.find({
      $or: [
        { "inspection.verdict": { $ne: "PASS" } },
        { "inspection.verdict": null },
      ],
    })
      .sort({ updatedAt: -1 })
      .lean();

    const zeroTraffic = await NoteAnalytics.find({
      "gsc.impressions": { $lte: 0 },
      "inspection.verdict": "PASS", // indexed but no traffic
    })
      .sort({ updatedAt: -1 })
      .lean();

    res.json({
      notIndexed: {
        count: notIndexed.length,
        notes: notIndexed.map((d) => ({
          slug:     d.noteSlug,
          url:      d.noteUrl,
          verdict:  d.inspection?.verdict,
          lastSync: d.lastInspectionSync,
        })),
      },
      zeroTraffic: {
        count: zeroTraffic.length,
        notes: zeroTraffic.map((d) => ({
          slug:        d.noteSlug,
          url:         d.noteUrl,
          impressions: d.gsc?.impressions,
          position:    d.gsc?.position,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
