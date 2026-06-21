import CampaignJob from "../models/campaignJob.model.js";
import Campaign from "../models/campaign.model.js";
import { ENV } from "../config/env.js";

/**
 * POST /webhooks/brevo
 * Receives open/click events from Brevo transactional webhooks.
 * Brevo sends an array of event objects in the request body.
 *
 * Auth: Bearer token in Authorization header
 */
export const handleBrevoWebhook = async (req, res) => {
  // ─── Token verification ───────────────────────────────────────
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (token !== ENV.BREVO_WEBHOOK_TOKEN) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Respond 200 immediately — Brevo retries if it doesn't get a fast response
  res.status(200).json({ received: true });

  // ─── Process events ───────────────────────────────────────────
  // Brevo sends either a single object or an array
  const events = Array.isArray(req.body) ? req.body : [req.body];

  for (const event of events) {
    try {
      await processEvent(event);
    } catch (err) {
      console.error("❌ Brevo webhook event error:", err.message, event);
    }
  }
};

async function processEvent(event) {
  const { event: type, "message-id": messageId } = event;
  if (!messageId) return;

  if (!["opened", "unique_opened", "clicked"].includes(type)) return;
  const job = await CampaignJob.findOne({ brevoMessageId: messageId });
  if (!job) {
    console.warn(`⚠️ No CampaignJob found for messageId: ${messageId}`);
    return;
  }

  if (type === "opened" || type === "unique_opened") {
    await handleOpen(job);
  } else if (type === "clicked") {
    await handleClick(job);
  }
}

async function handleOpen(job) {
  const isFirstOpen = job.openCount === 0;

  await CampaignJob.findByIdAndUpdate(job._id, {
    $inc: { openCount: 1 },
    ...(isFirstOpen && { firstOpenedAt: new Date() }),
  });

  // Increment campaign rollup only on first open
  if (isFirstOpen) {
    await Campaign.findByIdAndUpdate(job.campaignId, {
      $inc: { "stats.opened": 1 },
    });
  }

  console.log(`📬 Open tracked for job ${job._id} (total: ${job.openCount + 1})`);
}

async function handleClick(job) {
  const isFirstClick = job.clickCount === 0;

  await CampaignJob.findByIdAndUpdate(job._id, {
    $inc: { clickCount: 1 },
    ...(isFirstClick && { firstClickedAt: new Date() }),
  });

  // Increment campaign rollup only on first click
  if (isFirstClick) {
    await Campaign.findByIdAndUpdate(job.campaignId, {
      $inc: { "stats.clicked": 1 },
    });
  }

  console.log(`🖱️ Click tracked for job ${job._id} (total: ${job.clickCount + 1})`);
}