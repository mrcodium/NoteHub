import { Queue, Worker } from "bullmq";
import { bullRedis } from "../config/bullmq.config.js";

// Import sync logic (reuse the same service layer)
import NoteAnalytics from "../models/NoteAnalytics.model.js";
import {
  getSearchConsoleService,
  SITE_URL,
  daysAgo,
} from "../config/gsc.client.js";

// ─── Queue definitions ────────────────────────────────────────────────────────

export const gscAnalyticsQueue = new Queue("gsc-analytics", {
  connection: bullRedis,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 20,
  },
});

export const gscInspectionQueue = new Queue("gsc-inspection", {
  connection: bullRedis,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 20,
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
  },
});

// ─── Schedule recurring jobs ──────────────────────────────────────────────────
// Call this once at app startup

export const scheduleGscJobs = async () => {
  // Daily analytics sync at 03:00 UTC (GSC data is delayed ~24-72h anyway)
  await gscAnalyticsQueue.add(
    "daily-analytics-sync",
    {},
    {
      repeat: { cron: "0 3 * * *" },
      jobId:  "gsc-daily-analytics",   // deduplicated — only one scheduled at a time
    },
  );

  // Weekly inspection sync on Mondays at 04:00 UTC
  // Quota is 2000/day — only run weekly for the full set
  await gscInspectionQueue.add(
    "weekly-inspection-sync",
    { batchSize: 200 },               // inspect up to 200 notes per run
    {
      repeat: { cron: "0 4 * * 1" },
      jobId:  "gsc-weekly-inspection",
    },
  );

  console.log("[GSC] Cron jobs scheduled: daily analytics + weekly inspection.");
};

// ─── Analytics Worker ─────────────────────────────────────────────────────────

export const startGscAnalyticsWorker = () => {
  const worker = new Worker(
    "gsc-analytics",
    async (job) => {
      console.log(`[GSC Worker] Starting analytics sync job: ${job.name}`);

      const sc    = await getSearchConsoleService();
      const start = daysAgo(90);
      const end   = daysAgo(3);

      const [pageRes, deviceRes] = await Promise.all([
        sc.searchanalytics.query({
          siteUrl: SITE_URL,
          requestBody: { startDate: start, endDate: end, dimensions: ["page"], rowLimit: 25000 },
        }),
        sc.searchanalytics.query({
          siteUrl: SITE_URL,
          requestBody: { startDate: start, endDate: end, dimensions: ["page", "device"], rowLimit: 25000 },
        }),
      ]);

      const pageRows   = pageRes.data.rows   ?? [];
      const deviceRows = deviceRes.data.rows ?? [];

      // Build device map
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
        if (deviceMap[url]?.[d]) {
          deviceMap[url][d].clicks      = row.clicks      ?? 0;
          deviceMap[url][d].impressions = row.impressions ?? 0;
        }
      }

      const NOTES_PREFIX = `${SITE_URL}notes/`;
      const now          = new Date();
      const ops          = [];

      for (const row of pageRows) {
        const url = row.keys[0];
        if (!url.startsWith(NOTES_PREFIX)) continue;

        const slug = url.replace(NOTES_PREFIX, "").replace(/\/$/, "");

        ops.push({
          updateOne: {
            filter: { noteSlug: slug },
            update: {
              $set: {
                noteUrl:           url,
                "gsc.clicks":      row.clicks      ?? 0,
                "gsc.impressions": row.impressions ?? 0,
                "gsc.ctr":         row.ctr         ?? 0,
                "gsc.position":    row.position    ?? 0,
                "gsc.devices":     deviceMap[url]  ?? {},
                "gsc.syncedAt":    now,
                lastAnalyticsSync: now,
              },
            },
            upsert: true,
          },
        });
      }

      if (ops.length > 0) {
        await NoteAnalytics.bulkWrite(ops);
      }

      console.log(`[GSC Worker] Analytics sync done. ${ops.length} notes upserted.`);
      return { synced: ops.length };
    },
    { connection: bullRedis, concurrency: 1 },
  );

  worker.on("completed", (job, result) => {
    console.log(`[GSC Worker] Job ${job.name} done:`, result);
  });
  worker.on("failed", (job, err) => {
    console.error(`[GSC Worker] Job ${job?.name} failed:`, err.message);
  });

  return worker;
};

// ─── Inspection Worker ────────────────────────────────────────────────────────

export const startGscInspectionWorker = () => {
  const worker = new Worker(
    "gsc-inspection",
    async (job) => {
      const { batchSize = 50 } = job.data;
      console.log(`[GSC Worker] Starting inspection sync. Batch: ${batchSize}`);

      const sc          = await getSearchConsoleService();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const docs = await NoteAnalytics.find({
        $or: [
          { lastInspectionSync: null },
          { lastInspectionSync: { $lt: sevenDaysAgo } },
        ],
      })
        .limit(batchSize)
        .select("noteSlug noteUrl")
        .lean();

      const now     = new Date();
      let inspected = 0;
      let failed    = 0;

      for (const doc of docs) {
        try {
          const { data } = await sc.urlInspection.index.inspect({
            requestBody: {
              inspectionUrl: doc.noteUrl,
              siteUrl:       SITE_URL,
              languageCode:  "en-US",
            },
          });

          const r   = data.inspectionResult;
          const idx = r?.indexStatusResult;

          await NoteAnalytics.updateOne(
            { noteSlug: doc.noteSlug },
            {
              $set: {
                "inspection.verdict":             r?.verdict                           ?? null,
                "inspection.indexingState":       idx?.indexingState                   ?? null,
                "inspection.robotsTxtState":      idx?.robotsTxtState                  ?? null,
                "inspection.pageFetchState":      idx?.pageFetchState                  ?? null,
                "inspection.lastCrawlTime":       idx?.lastCrawlTime ? new Date(idx.lastCrawlTime) : null,
                "inspection.crawledAs":           idx?.crawledAs                       ?? null,
                "inspection.googleCanonical":     idx?.googleCanonicalUrl              ?? null,
                "inspection.userCanonical":       idx?.userCanonicalUrl                ?? null,
                "inspection.richResultsVerdict":  r?.richResultsResult?.verdict        ?? null,
                "inspection.mobileVerdict":       r?.mobileUsabilityResult?.verdict    ?? null,
                "inspection.syncedAt":            now,
                lastInspectionSync:               now,
              },
            },
          );

          inspected++;
        } catch (err) {
          console.error(`[GSC Worker] Inspection failed for ${doc.noteUrl}:`, err.message);
          failed++;
        }

        // 200ms between requests — stay within quota
        await new Promise((r) => setTimeout(r, 200));
      }

      console.log(`[GSC Worker] Inspection done. Inspected: ${inspected}, Failed: ${failed}`);
      return { inspected, failed };
    },
    { connection: bullRedis, concurrency: 1 },
  );

  worker.on("completed", (job, result) => {
    console.log(`[GSC Worker] Inspection job done:`, result);
  });
  worker.on("failed", (job, err) => {
    console.error(`[GSC Worker] Inspection job failed:`, err.message);
  });

  return worker;
};