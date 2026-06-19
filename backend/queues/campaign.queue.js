import { Queue, Worker } from "bullmq";
import { bullRedis } from "../config/bullmq.config.js";
import { sendBrevoEmail } from "../services/mailer.service.js";
import Campaign from "../models/campaign.model.js";
import CampaignJob from "../models/campaignJob.model.js";
import SuppressedEmail from "../models/suppressedEmail.model.js";
import { Liquid } from "liquidjs";
import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";
import { getIO } from "../utils/socket.js";
import { TEMPLATE_GLOBALS } from "../utils/mailer-global.js";

const liquidEngine = new Liquid({
  strictFilters: false,
  strictVariables: false,
});

// ─── Campaign Cache ───────────────────────────────────────────
// Keyed by campaignId string.
// Stores { htmlBody, subject, extraJson, extraMap }
// extraMap: Map<email, perRecipientData> for O(1) lookup (per-recipient mode)
// Cleared after campaign finalizes to avoid memory leaks.

const campaignCache = new Map();

export function getCachedCampaign(campaignId) {
  return campaignCache.get(campaignId.toString()) ?? null;
}

export function setCampaignCache(campaignId, campaign, isPerRecipient) {
  const extraMap = new Map();

  if (isPerRecipient && Array.isArray(campaign.extraJson)) {
    for (const entry of campaign.extraJson) {
      if (typeof entry.email === "string") {
        extraMap.set(entry.email.trim().toLowerCase(), entry);
      }
    }
  }

  campaignCache.set(campaignId.toString(), {
    htmlBody: campaign.htmlBody,
    subject: campaign.subject,
    previewText: campaign.previewText,
    extraJson: campaign.extraJson,
    isPerRecipient,
    extraMap,
  });
}

function clearCampaignCache(campaignId) {
  campaignCache.delete(campaignId.toString());
}

// ─── Queues ───────────────────────────────────────────────────

export const dispatchQueue = new Queue("campaign-dispatch", {
  connection: bullRedis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: true,
    removeOnFail: 100,
  },
});

export const sendQueue = new Queue("campaign-send", {
  connection: bullRedis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: true,
    removeOnFail: 100,
  },
});

// ─── Helpers ──────────────────────────────────────────────────

function generateUnsubscribeToken(email, campaignId) {
  return jwt.sign(
    { email, campaignId: campaignId.toString() },
    ENV.UNSUBSCRIBE_JWT_SECRET,
    { expiresIn: "1y" },
  );
}

function buildUnsubscribeUrl(email, campaignId) {
  const token = generateUnsubscribeToken(email, campaignId);
  return `${ENV.BACKEND_URL}/unsubscribe?token=${token}`;
}

// ─── Dispatch Worker ──────────────────────────────────────────
// Fans out one send-job per recipient email.
// Populates campaign cache so sendWorker never hits MongoDB for campaign data.

export const dispatchWorker = new Worker(
  "campaign-dispatch",
  async (job) => {
    const { campaignId } = job.data;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

    const { extraJson, emails } = campaign;

    // Derive authoritative email list
    let recipientEmails = emails ?? [];
    let isPerRecipient = false;

    if (Array.isArray(extraJson) && extraJson.length > 0) {
      const derived = [
        ...new Set(
          extraJson
            .map((e) =>
              typeof e.email === "string" ? e.email.trim().toLowerCase() : null,
            )
            .filter(Boolean),
        ),
      ];
      if (derived.length > 0) {
        recipientEmails = derived;
        isPerRecipient = true;
      }
    }

    if (recipientEmails.length === 0) {
      await Campaign.findByIdAndUpdate(campaignId, {
        status: "failed",
        "stats.total": 0,
      });
      throw new Error("No valid recipients for campaign");
    }

    // ── Suppression check ──────────────────────────────────────
    const suppressed = await SuppressedEmail.find({
      email: { $in: recipientEmails },
    }).select("email");

    const suppressedSet = new Set(suppressed.map((s) => s.email));

    const activeEmails = recipientEmails.filter((e) => !suppressedSet.has(e));
    const skippedEmails = recipientEmails.filter((e) => suppressedSet.has(e));

    // Mark campaign as sending
    await Campaign.findByIdAndUpdate(campaignId, {
      status: "sending",
      sentAt: new Date(),
      "stats.total": recipientEmails.length,
      "stats.sent": 0,
      "stats.failed": 0,
      "stats.skipped": skippedEmails.length,
    });

    // ── Populate cache before fanning out ─────────────────────
    // sendWorker jobs will be processed immediately after addBulk,
    // so cache must be set before that call.
    setCampaignCache(campaignId, campaign, isPerRecipient);

    // Create "skipped" CampaignJob docs for suppressed emails
    if (skippedEmails.length > 0) {
      const skippedDocs = await CampaignJob.insertMany(
        skippedEmails.map((email) => ({
          campaignId: campaign._id,
          email,
          status: "skipped",
          processedAt: new Date(),
        })),
      );

      skippedDocs.forEach((doc) => {
        getIO()?.to(campaignId.toString()).emit("campaign:job", {
          _id: doc._id.toString(),
          email: doc.email,
          status: "skipped",
          processedAt: doc.processedAt,
        });
      });
    }

    // If everyone was suppressed, finalize immediately
    if (activeEmails.length === 0) {
      await Campaign.findByIdAndUpdate(campaignId, { status: "done" });
      clearCampaignCache(campaignId);

      getIO()
        ?.to(campaignId.toString())
        .emit("campaign:done", {
          stats: {
            total: recipientEmails.length,
            skipped: skippedEmails.length,
            sent: 0,
            failed: 0,
          },
          status: "done",
        });

      console.log(
        `✅ Campaign ${campaignId} — all recipients suppressed, marked done`,
      );
      return;
    }

    // Create pending CampaignJob docs for active recipients
    const jobDocs = await CampaignJob.insertMany(
      activeEmails.map((email) => ({
        campaignId: campaign._id,
        email,
        status: "pending",
      })),
    );

    // Fan out — tiny payloads only, no campaign data
    await sendQueue.addBulk(
      activeEmails.map((email, i) => ({
        name: "send-email",
        data: {
          campaignId: campaignId.toString(),
          campaignJobId: jobDocs[i]._id.toString(),
          email,
        },
      })),
    );

    console.log(
      `✅ Dispatched ${activeEmails.length} send jobs for campaign ${campaignId}` +
        (skippedEmails.length > 0
          ? ` (${skippedEmails.length} suppressed, skipped)`
          : ""),
    );
  },
  {
    connection: bullRedis,
    concurrency: 1,
  },
);

// ─── Send Worker ──────────────────────────────────────────────
// Reads campaign data from in-memory cache (set by dispatchWorker).
// Falls back to MongoDB if cache miss (e.g. after server restart mid-campaign).

export const sendWorker = new Worker(
  "campaign-send",
  async (job) => {
    const { campaignId, campaignJobId, email } = job.data;

    // ── Resolve campaign data ──────────────────────────────────
    let cached = getCachedCampaign(campaignId);

    if (!cached) {
      // Cache miss: server restarted mid-campaign, rebuild from DB
      console.warn(
        `⚠️ Cache miss for campaign ${campaignId}, fetching from DB`,
      );
      const campaign = await Campaign.findById(campaignId).lean();
      if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

      const isPerRecipient =
        Array.isArray(campaign.extraJson) && campaign.extraJson.length > 0;

      setCampaignCache(campaignId, campaign, isPerRecipient);
      cached = getCachedCampaign(campaignId);
    }

    const {
      htmlBody,
      subject,
      previewText,
      isPerRecipient,
      extraMap,
      extraJson,
    } = cached;

    // ── Resolve per-recipient or shared extraJson ──────────────
    const extra = isPerRecipient
      ? (extraMap.get(email) ?? {})
      : (extraJson ?? {});

    // ── Build liquid context ───────────────────────────────────
    const context = {
      ...TEMPLATE_GLOBALS,
      extra,
      unsubscribe_url: buildUnsubscribeUrl(email, campaignId),
    };

    const renderedSubject = await liquidEngine.parseAndRender(subject, context);
    const renderedHtml = await liquidEngine.parseAndRender(htmlBody, context);
    const renderedPreviewText = await liquidEngine.parseAndRender(
      previewText || "",
      context,
    );

    const brevoRes = await sendBrevoEmail({
      to: email,
      subject: renderedSubject,
      html: renderedHtml,
      previewText: renderedPreviewText,
    });

    // Mark job sent
    await CampaignJob.findByIdAndUpdate(campaignJobId, {
      status: "sent",
      brevoMessageId: brevoRes.messageId || null,
      processedAt: new Date(),
    });

    getIO()
      ?.to(campaignId.toString())
      .emit("campaign:job", {
        _id: campaignJobId,
        email,
        status: "sent",
        brevoMessageId: brevoRes.messageId || null,
        processedAt: new Date(),
      });

    await Campaign.findByIdAndUpdate(campaignId, {
      $inc: { "stats.sent": 1 },
    });

    await tryFinalizeCampaign(campaignId);
  },
  {
    connection: bullRedis,
    concurrency: 5,
  },
);

// ─── Finalize helper ──────────────────────────────────────────

async function tryFinalizeCampaign(campaignId) {
  const campaign = await Campaign.findById(campaignId).select("stats status");
  if (!campaign) return;
  if (campaign.status === "done" || campaign.status === "failed") return;

  const { total, sent, failed, skipped = 0 } = campaign.stats;
  if (total === 0) return;

  getIO()?.to(campaignId.toString()).emit("campaign:progress", {
    stats: campaign.stats,
  });

  if (sent + failed + skipped < total) return;

  const finalStatus = failed > 0 && sent === 0 ? "failed" : "done";

  await Campaign.findOneAndUpdate(
    { _id: campaignId, status: "sending" },
    { status: finalStatus },
  );

  // ── Clear cache after campaign completes ───────────────────
  clearCampaignCache(campaignId);

  getIO()?.to(campaignId.toString()).emit("campaign:done", {
    stats: campaign.stats,
    status: finalStatus,
  });

  console.log(`✅ Campaign ${campaignId} finalized as "${finalStatus}"`);
}

// ─── Send Worker failure handler ──────────────────────────────

sendWorker.on("failed", async (job, err) => {
  if (!job) return;
  const { campaignJobId, campaignId, email } = job.data;

  if (job.attemptsMade >= (job.opts?.attempts ?? 3)) {
    await CampaignJob.findByIdAndUpdate(campaignJobId, {
      status: "failed",
      error: err.message,
      processedAt: new Date(),
    });

    getIO()?.to(campaignId.toString()).emit("campaign:job", {
      _id: campaignJobId,
      email,
      status: "failed",
      error: err.message,
      processedAt: new Date(),
    });

    await Campaign.findByIdAndUpdate(campaignId, {
      $inc: { "stats.failed": 1 },
    });

    await tryFinalizeCampaign(campaignId);
  }

  console.error(
    `❌ Send job failed for campaign ${campaignId} (attempt ${job.attemptsMade}):`,
    err.message,
  );
});

// ─── Dispatch Worker failure handler ─────────────────────────

dispatchWorker.on("failed", async (job, err) => {
  if (!job) return;
  clearCampaignCache(job.data.campaignId);
  await Campaign.findByIdAndUpdate(job.data.campaignId, { status: "failed" });
  console.error("❌ Dispatch job failed:", err.message);
});

console.log("✅ BullMQ workers started");
