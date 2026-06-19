import NoteAnalytics from "../models/NoteAnalytics.model.js";
import {
  getSearchConsoleService,
  SITE_URL,
  daysAgo,
} from "../config/gsc.client.js";

// ─── Shared: upsert helper ────────────────────────────────────────────────────
const upsertAnalytics = (slug, url, update) =>
  NoteAnalytics.findOneAndUpdate(
    { noteSlug: slug },
    { $set: { noteUrl: url, ...update } },
    { upsert: true, new: true },
  );

// ─── POST /api/admin/gsc/sync/analytics ───────────────────────────────────────
// Bulk sync: one GSC call → upsert all NoteAnalytics docs
// Call this from daily cron or manually from admin panel
export const syncAllAnalytics = async (req, res) => {
  try {
    const sc    = await getSearchConsoleService();
    const start = req.body?.start || daysAgo(90);
    const end   = req.body?.end   || daysAgo(3);

    // ── 1. Fetch all page-level data in ONE call ────────────────────────────
    const [pageRes, deviceRes] = await Promise.all([
      sc.searchanalytics.query({
        siteUrl: SITE_URL,
        requestBody: {
          startDate: start,
          endDate:   end,
          dimensions: ["page"],
          rowLimit:   25000,
        },
      }),
      // Device breakdown per page (separate call)
      sc.searchanalytics.query({
        siteUrl: SITE_URL,
        requestBody: {
          startDate: start,
          endDate:   end,
          dimensions: ["page", "device"],
          rowLimit:   25000,
        },
      }),
    ]);

    const pageRows   = pageRes.data.rows   ?? [];
    const deviceRows = deviceRes.data.rows ?? [];

    // ── 2. Build a device map: url → { desktop, mobile, tablet } ──────────
    const deviceMap = {};
    for (const row of deviceRows) {
      const [url, device] = row.keys;
      if (!deviceMap[url]) {
        deviceMap[url] = {
          desktop: { clicks: 0, impressions: 0 },
          mobile:  { clicks: 0, impressions: 0 },
          tablet:  { clicks: 0, impressions: 0 },
        };
      }
      const d = device?.toLowerCase();
      if (deviceMap[url][d]) {
        deviceMap[url][d].clicks      = row.clicks      ?? 0;
        deviceMap[url][d].impressions = row.impressions ?? 0;
      }
    }

    // ── 3. For top-50 pages, fetch their top queries (batched) ───────────
    // We only do this for top pages to stay within rate limits
    const TOP_PAGES_FOR_QUERIES = pageRows.slice(0, 50);

    const queryResults = await Promise.all(
      TOP_PAGES_FOR_QUERIES.map((row) =>
        sc.searchanalytics
          .query({
            siteUrl: SITE_URL,
            requestBody: {
              startDate: start,
              endDate:   end,
              dimensions: ["query"],
              dimensionFilterGroups: [
                {
                  filters: [
                    { dimension: "page", operator: "equals", expression: row.keys[0] },
                  ],
                },
              ],
              rowLimit: 10,
            },
          })
          .then((r) => ({ url: row.keys[0], rows: r.data.rows ?? [] }))
          .catch(() => ({ url: row.keys[0], rows: [] })),
      ),
    );

    const queryMap = Object.fromEntries(
      queryResults.map(({ url, rows }) => [url, rows]),
    );

    // ── 4. Bulk upsert NoteAnalytics ──────────────────────────────────────
    const NOTES_PREFIX = `${SITE_URL}notes/`;
    const now          = new Date();
    let   synced       = 0;
    let   skipped      = 0;

    const ops = pageRows
      .filter((row) => row.keys[0].startsWith(NOTES_PREFIX))
      .map((row) => {
        const url  = row.keys[0];
        const slug = url.replace(NOTES_PREFIX, "").replace(/\/$/, "");

        const topQueries = (queryMap[url] ?? []).map((q) => ({
          query:       q.keys[0],
          clicks:      q.clicks      ?? 0,
          impressions: q.impressions ?? 0,
          ctr:         q.ctr         ?? 0,
          position:    q.position    ?? 0,
        }));

        synced++;
        return {
          updateOne: {
            filter: { noteSlug: slug },
            update: {
              $set: {
                noteUrl: url,
                "gsc.clicks":      row.clicks      ?? 0,
                "gsc.impressions": row.impressions ?? 0,
                "gsc.ctr":         row.ctr         ?? 0,
                "gsc.position":    row.position    ?? 0,
                "gsc.topQueries":  topQueries,
                "gsc.devices":     deviceMap[url] ?? {},
                "gsc.syncedAt":    now,
                lastAnalyticsSync: now,
              },
            },
            upsert: true,
          },
        };
      });

    if (ops.length > 0) {
      await NoteAnalytics.bulkWrite(ops);
    }

    res.json({
      message: "✅ Analytics sync complete.",
      synced: ops.length,
      skipped: pageRows.length - ops.length, // non-note pages filtered out
      dateRange: { start, end },
    });
  } catch (err) {
    console.error("[GSC] syncAllAnalytics error:", err);
    res.status(err.status || 500).json({ error: err.message });
  }
};

// ─── POST /api/admin/gsc/sync/inspection ──────────────────────────────────────
// Inspect indexing status per note (quota: 2000/day — batched carefully)
export const syncInspection = async (req, res) => {
  try {
    const sc = await getSearchConsoleService();

    // Respect daily quota — inspect in batches
    // Default: only notes not inspected in the last 7 days
    const {
      batchSize = 50,    // max per manual trigger
      forceAll  = false, // re-inspect even recently checked ones
    } = req.body ?? {};

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const query = forceAll
      ? {}
      : {
          $or: [
            { lastInspectionSync: null },
            { lastInspectionSync: { $lt: sevenDaysAgo } },
          ],
        };

    const docs = await NoteAnalytics.find(query)
      .limit(Number(batchSize))
      .select("noteSlug noteUrl")
      .lean();

    if (docs.length === 0) {
      return res.json({ message: "Nothing to inspect.", inspected: 0 });
    }

    const now     = new Date();
    let inspected = 0;
    let failed    = 0;

    // Process sequentially to be safe with quota
    for (const doc of docs) {
      try {
        const { data } = await sc.urlInspection.index.inspect({
          requestBody: {
            inspectionUrl: doc.noteUrl,
            siteUrl:       SITE_URL,
            languageCode:  "en-US",
          },
        });

        const r = data.inspectionResult;
        const idx = r?.indexStatusResult;

        await NoteAnalytics.updateOne(
          { noteSlug: doc.noteSlug },
          {
            $set: {
              "inspection.verdict":          r?.verdict                      ?? null,
              "inspection.indexingState":    idx?.indexingState              ?? null,
              "inspection.robotsTxtState":   idx?.robotsTxtState             ?? null,
              "inspection.pageFetchState":   idx?.pageFetchState             ?? null,
              "inspection.lastCrawlTime":    idx?.lastCrawlTime
                ? new Date(idx.lastCrawlTime)
                : null,
              "inspection.crawledAs":        idx?.crawledAs                  ?? null,
              "inspection.googleCanonical":  idx?.googleCanonicalUrl         ?? null,
              "inspection.userCanonical":    idx?.userCanonicalUrl           ?? null,
              "inspection.richResultsVerdict": r?.richResultsResult?.verdict ?? null,
              "inspection.mobileVerdict":      r?.mobileUsabilityResult?.verdict ?? null,
              "inspection.syncedAt":         now,
              lastInspectionSync:            now,
            },
          },
        );

        inspected++;
      } catch (inspectErr) {
        console.error(`[GSC] Inspection failed for ${doc.noteUrl}:`, inspectErr.message);
        failed++;
      }

      // Small delay between requests to respect rate limits
      await new Promise((r) => setTimeout(r, 200));
    }

    res.json({
      message:   "✅ Inspection sync complete.",
      inspected,
      failed,
      remaining: (await NoteAnalytics.countDocuments(query)) - inspected,
    });
  } catch (err) {
    console.error("[GSC] syncInspection error:", err);
    res.status(err.status || 500).json({ error: err.message });
  }
};

// ─── POST /api/admin/gsc/sync/note/:slug ──────────────────────────────────────
// Sync a single note (called after publish — search analytics + inspection)
export const syncSingleNote = async (req, res) => {
  const { slug } = req.params;
  if (!slug) return res.status(400).json({ error: "slug is required." });

  const url = `${SITE_URL}notes/${slug}`;

  try {
    const sc    = await getSearchConsoleService();
    const start = daysAgo(90);
    const end   = daysAgo(3);
    const now   = new Date();

    // Run analytics + inspection in parallel
    const [queriesRes, inspectionRes] = await Promise.allSettled([
      sc.searchanalytics.query({
        siteUrl: SITE_URL,
        requestBody: {
          startDate: start,
          endDate:   end,
          dimensions: ["query"],
          dimensionFilterGroups: [
            { filters: [{ dimension: "page", operator: "equals", expression: url }] },
          ],
          rowLimit: 20,
        },
      }),
      sc.urlInspection.index.inspect({
        requestBody: { inspectionUrl: url, siteUrl: SITE_URL, languageCode: "en-US" },
      }),
    ]);

    const update = { noteUrl: url };

    // ── Analytics ──────────────────────────────────────────────────────────
    if (queriesRes.status === "fulfilled") {
      const rows = queriesRes.value.data.rows ?? [];
      const totals = rows.reduce(
        (acc, r) => {
          acc.clicks      += r.clicks      ?? 0;
          acc.impressions += r.impressions ?? 0;
          return acc;
        },
        { clicks: 0, impressions: 0 },
      );

      update["gsc.clicks"]      = totals.clicks;
      update["gsc.impressions"] = totals.impressions;
      update["gsc.ctr"]         = rows[0]?.ctr      ?? 0;
      update["gsc.position"]    = rows[0]?.position  ?? 0;
      update["gsc.topQueries"]  = rows.map((r) => ({
        query: r.keys[0], clicks: r.clicks, impressions: r.impressions,
        ctr: r.ctr, position: r.position,
      }));
      update["gsc.syncedAt"]    = now;
      update.lastAnalyticsSync  = now;
    }

    // ── Inspection ─────────────────────────────────────────────────────────
    if (inspectionRes.status === "fulfilled") {
      const r   = inspectionRes.value.data.inspectionResult;
      const idx = r?.indexStatusResult;

      update["inspection.verdict"]          = r?.verdict                         ?? null;
      update["inspection.indexingState"]    = idx?.indexingState                 ?? null;
      update["inspection.robotsTxtState"]   = idx?.robotsTxtState                ?? null;
      update["inspection.pageFetchState"]   = idx?.pageFetchState                ?? null;
      update["inspection.lastCrawlTime"]    = idx?.lastCrawlTime ? new Date(idx.lastCrawlTime) : null;
      update["inspection.crawledAs"]        = idx?.crawledAs                     ?? null;
      update["inspection.googleCanonical"]  = idx?.googleCanonicalUrl            ?? null;
      update["inspection.userCanonical"]    = idx?.userCanonicalUrl              ?? null;
      update["inspection.richResultsVerdict"] = r?.richResultsResult?.verdict    ?? null;
      update["inspection.mobileVerdict"]      = r?.mobileUsabilityResult?.verdict ?? null;
      update["inspection.syncedAt"]         = now;
      update.lastInspectionSync             = now;
    }

    const doc = await upsertAnalytics(slug, url, update);

    res.json({
      message:    "✅ Note synced.",
      slug,
      analytics:  queriesRes.status,
      inspection: inspectionRes.status,
      doc,
    });
  } catch (err) {
    console.error("[GSC] syncSingleNote error:", err);
    res.status(err.status || 500).json({ error: err.message });
  }
};

// ─── POST /api/admin/gsc/sitemap/ping ─────────────────────────────────────────
// Ping Google to re-crawl sitemap — call after publishing a note
export const pingSitemap = async (req, res) => {
  try {
    const sc = await getSearchConsoleService();

    await sc.sitemaps.submit({
      siteUrl:  SITE_URL,
      feedpath: `${SITE_URL}sitemap.xml`,
    });

    res.json({ message: "✅ Sitemap pinged successfully." });
  } catch (err) {
    console.error("[GSC] pingSitemap error:", err);
    res.status(err.status || 500).json({ error: err.message });
  }
};

// ─── GET /api/admin/gsc/sitemaps ──────────────────────────────────────────────
export const getSitemaps = async (req, res) => {
  try {
    const sc = await getSearchConsoleService();
    const { data } = await sc.sitemaps.list({ siteUrl: SITE_URL });

    res.json({ sitemaps: data.sitemap ?? [] });
  } catch (err) {
    console.error("[GSC] getSitemaps error:", err);
    res.status(err.status || 500).json({ error: err.message });
  }
};