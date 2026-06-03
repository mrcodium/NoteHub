import { Queue, Worker } from "bullmq";
import { bullRedis } from "../config/bullmq.config.js";
import { sendBrevoEmail } from "../services/mailer.service.js";
import Campaign from "../model/campaign.model.js";
import CampaignJob from "../model/campaignJob.model.js";
import SuppressedEmail from "../model/suppressedEmail.model.js";
import { Liquid } from "liquidjs";
import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";

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

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Generate a signed JWT unsubscribe token for a recipient.
 * Stateless — no DB write. Verified on click.
 */
function generateUnsubscribeToken(email, campaignId) {
  return jwt.sign(
    { email, campaignId: campaignId.toString() },
    ENV.UNSUBSCRIBE_JWT_SECRET,
    { expiresIn: "1y" }
  );
}

/**
 * Build the full unsubscribe URL injected into every email's liquid context.
 */
function buildUnsubscribeUrl(email, campaignId) {
  const token = generateUnsubscribeToken(email, campaignId);
  return `${ENV.BACKEND_URL}/unsubscribe?token=${token}`;
}

// ─── Dispatch Worker ──────────────────────────────────────────
// Fans out one send-job per recipient email.
// Suppressed emails are skipped (CampaignJob created with status "skipped").

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

    // ── Suppression check ──────────────────────────────────────
    // Bulk fetch all suppressed emails in one query
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
      // total = active + skipped; skipped counts toward processed immediately
      "stats.total": recipientEmails.length,
      "stats.sent": 0,
      "stats.failed": 0,
      "stats.skipped": skippedEmails.length,
    });

    // Create "skipped" CampaignJob docs for suppressed emails
    if (skippedEmails.length > 0) {
      await CampaignJob.insertMany(
        skippedEmails.map((email) => ({
          campaignId: campaign._id,
          email,
          status: "skipped",
          processedAt: new Date(),
        }))
      );
    }

    // If everyone was suppressed, finalize immediately
    if (activeEmails.length === 0) {
      await Campaign.findByIdAndUpdate(campaignId, { status: "done" });
      console.log(`✅ Campaign ${campaignId} — all recipients suppressed, marked done`);
      return;
    }

    // Create pending CampaignJob docs for active recipients
    const jobDocs = await CampaignJob.insertMany(
      activeEmails.map((email) => ({
        campaignId: campaign._id,
        email,
        status: "pending",
      }))
    );

    // Fan out to send queue
    await sendQueue.addBulk(
      activeEmails.map((email, i) => ({
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

    console.log(
      `✅ Dispatched ${activeEmails.length} send jobs for campaign ${campaignId}` +
      (skippedEmails.length > 0 ? ` (${skippedEmails.length} suppressed, skipped)` : "")
    );
  },
  {
    connection: bullRedis,
    concurrency: 1,
  }
);

// ─── Send Worker ──────────────────────────────────────────────
// Renders liquid (including unsubscribe_url) + sends via Brevo.

export const TEMPLATE_GLOBALS = {
  logo:       "https://res.cloudinary.com/dhtxrpqna/image/upload/v1770061775/notehub_2_xgrpqt.png",
  github:     "https://img.icons8.com/?size=100&id=12599&format=png&color=a1a1a1",
  linkedin:   "https://img.icons8.com/?size=100&id=8808&format=png&color=a1a1a1",
  youtube:    "https://img.icons8.com/?size=100&id=37326&format=png&color=a1a1a1",
  x:          "https://img.icons8.com/?size=100&id=phOKFKYpe00C&format=png&color=a1a1a1",
  twitter:    "https://img.icons8.com/?size=100&id=phOKFKYpe00C&format=png&color=a1a1a1",
  instagram:  "https://img.icons8.com/?size=100&id=32309&format=png&color=a1a1a1",
  facebook:   "https://img.icons8.com/?size=100&id=118467&format=png&color=a1a1a1",
};

export const sendWorker = new Worker(
  "campaign-send",
  async (job) => {
    const { campaignId, campaignJobId, email, subject, htmlBody, extraJson } = job.data;

    // Build liquid context — inject unsubscribe_url automatically
    const context = {
      ...TEMPLATE_GLOBALS,
      extra: extraJson ?? {},
      unsubscribe_url: buildUnsubscribeUrl(email, campaignId),
    };

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

    await tryFinalizeCampaign(campaignId);
  },
  {
    connection: bullRedis,
    concurrency: 5,
  }
);

// ─── Finalize helper ──────────────────────────────────────────
// Finalizes when sent + failed + skipped === total.

async function tryFinalizeCampaign(campaignId) {
  const campaign = await Campaign.findById(campaignId).select("stats status");
  if (!campaign) return;
  if (campaign.status === "done" || campaign.status === "failed") return;

  const { total, sent, failed, skipped = 0 } = campaign.stats;
  if (total === 0) return;
  if (sent + failed + skipped < total) return;

  const finalStatus = failed > 0 && sent === 0 ? "failed" : "done";

  await Campaign.findOneAndUpdate(
    { _id: campaignId, status: "sending" },
    { status: finalStatus }
  );

  console.log(`✅ Campaign ${campaignId} finalized as "${finalStatus}"`);
}

// ─── Send Worker failure handler ──────────────────────────────

sendWorker.on("failed", async (job, err) => {
  if (!job) return;
  const { campaignJobId, campaignId } = job.data;

  if (job.attemptsMade >= (job.opts?.attempts ?? 3)) {
    await CampaignJob.findByIdAndUpdate(campaignJobId, {
      status: "failed",
      error: err.message,
      processedAt: new Date(),
    });

    await Campaign.findByIdAndUpdate(campaignId, {
      $inc: { "stats.failed": 1 },
    });

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