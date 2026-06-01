import { Queue, Worker } from "bullmq";
import { bullRedis } from "../config/bullmq.config.js";
import { sendBrevoEmail } from "../services/mailer.service.js";
import Campaign from "../model/campaign.model.js";
import CampaignJob from "../model/campaignJob.model.js";
import { Liquid } from "liquidjs";
import IORedis from "ioredis";

const liquidEngine = new Liquid({ strictFilters: false, strictVariables: false });

// ─── Queues ───────────────────────────────────────────────────

export const dispatchQueue = new Queue("campaign-dispatch", {
  connection: bullRedis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export const sendQueue = new Queue("campaign-send", {
  connection: bullRedis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 500,
    removeOnFail: 500,
  },
});

// ─── Dispatch Worker ──────────────────────────────────────────
// Fans out one send-job per recipient email.
// If extraJson is a per-recipient array, emails are derived from it
// (frontend already does this, but worker stays consistent).

export const dispatchWorker = new Worker(
  "campaign-dispatch",
  async (job) => {
    const { campaignId } = job.data;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

    const { htmlBody, subject, extraJson, emails } = campaign;

    // Derive authoritative email list
    let recipientEmails = emails ?? [];
    let isPerRecipient = false;

    if (Array.isArray(extraJson) && extraJson.length > 0) {
      const derived = [
        ...new Set(
          extraJson
            .map((e) => (typeof e.email === "string" ? e.email.trim().toLowerCase() : null))
            .filter(Boolean)
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

    // Mark campaign as sending
    await Campaign.findByIdAndUpdate(campaignId, {
      status: "sending",
      sentAt: new Date(),
      "stats.total": recipientEmails.length,
      "stats.sent": 0,
      "stats.failed": 0,
    });

    // Create pending CampaignJob docs
    const jobDocs = await CampaignJob.insertMany(
      recipientEmails.map((email) => ({
        campaignId: campaign._id,
        email,
        status: "pending",
      }))
    );

    // Fan out to send queue
    await sendQueue.addBulk(
      recipientEmails.map((email, i) => ({
        name: "send-email",
        data: {
          campaignId: campaignId.toString(),
          campaignJobId: jobDocs[i]._id.toString(),
          email,
          subject,
          htmlBody,
          extraJson: isPerRecipient
            ? extraJson.find(
                (e) => typeof e.email === "string" && e.email.trim().toLowerCase() === email
              ) ?? {}
            : extraJson ?? {},
        },
      }))
    );

    console.log(`✅ Dispatched ${recipientEmails.length} send jobs for campaign ${campaignId}`);
  },
  {
    connection: bullRedis,
    concurrency: 1,
  }
);

// ─── Send Worker ──────────────────────────────────────────────
// Renders liquid + sends via Brevo.
// Marks campaign done/failed when all jobs are processed — no SSE dependency.

export const sendWorker = new Worker(
  "campaign-send",
  async (job) => {
    const { campaignId, campaignJobId, email, subject, htmlBody, extraJson } = job.data;

    // Build liquid context — extra only, no user lookup
    const context = { extra: extraJson ?? {} };

    const renderedSubject = await liquidEngine.parseAndRender(subject, context);
    const renderedHtml = await liquidEngine.parseAndRender(htmlBody, context);

    const brevoRes = await sendBrevoEmail({
      to: email,
      subject: renderedSubject,
      html: renderedHtml,
    });

    // Mark job sent
    await CampaignJob.findByIdAndUpdate(campaignJobId, {
      status: "sent",
      brevoMessageId: brevoRes.messageId || null,
      processedAt: new Date(),
    });

    // Atomically increment sent count
    await Campaign.findByIdAndUpdate(campaignId, {
      $inc: { "stats.sent": 1 },
    });

    // Check if all jobs are done — finalize campaign
    await tryFinalizeCampaign(campaignId);
  },
  {
    connection: bullRedis,
    concurrency: 5,
  }
);

// ─── Finalize helper ──────────────────────────────────────────
// Called after every completed or failed job.
// Uses findOneAndUpdate with a condition so only one worker wins the race.

async function tryFinalizeCampaign(campaignId) {
  const campaign = await Campaign.findById(campaignId).select("stats status");
  if (!campaign) return;
  if (campaign.status === "done" || campaign.status === "failed") return;

  const { total, sent, failed } = campaign.stats;
  if (total === 0) return;
  if (sent + failed < total) return;

  const finalStatus = failed === total ? "failed" : "done";

  // Atomic conditional update — prevents double-write if two workers finish simultaneously
  await Campaign.findOneAndUpdate(
    {
      _id: campaignId,
      status: "sending", // only update if still in sending state
    },
    { status: finalStatus }
  );

  console.log(`✅ Campaign ${campaignId} finalized as "${finalStatus}"`);
}

// ─── Send Worker failure handler ──────────────────────────────

sendWorker.on("failed", async (job, err) => {
  if (!job) return;
  const { campaignJobId, campaignId } = job.data;

  // Only update if this was the final attempt (no more retries)
  if (job.attemptsMade >= (job.opts?.attempts ?? 3)) {
    await CampaignJob.findByIdAndUpdate(campaignJobId, {
      status: "failed",
      error: err.message,
      processedAt: new Date(),
    });

    await Campaign.findByIdAndUpdate(campaignId, {
      $inc: { "stats.failed": 1 },
    });

    // Check finalization after failure too
    await tryFinalizeCampaign(campaignId);
  }

  console.error(`❌ Send job failed for campaign ${campaignId} (attempt ${job.attemptsMade}):`, err.message);
});

// ─── Dispatch Worker failure handler ─────────────────────────

dispatchWorker.on("failed", async (job, err) => {
  if (!job) return;
  await Campaign.findByIdAndUpdate(job.data.campaignId, { status: "failed" });
  console.error("❌ Dispatch job failed:", err.message);
});

console.log("✅ BullMQ workers started");