import { Queue, Worker, QueueEvents } from "bullmq";
import { bullRedis } from "../config/bullmq.config.js";
import { buildContext, sendBrevoEmail } from "../services/mailer.service.js";
import Campaign from "../model/campaign.model.js";
import CampaignJob from "../model/campaignJob.model.js";
import Contact from "../model/contact.model.js";
import Template from "../model/template.model.js";
import User from "../model/user.model.js";
import { Liquid } from "liquidjs";
import IORedis from "ioredis"

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

// ─── QueueEvents (for SSE progress) ──────────────────────────

export const sendQueueEvents = new QueueEvents("campaign-send", {
  connection: new IORedis({
    host: bullRedis.options.host,
    port: bullRedis.options.port,
    password: bullRedis.options.password,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  }),
});

// ─── Dispatch Worker ──────────────────────────────────────────
// One job per campaign → fans out to N send jobs

export const dispatchWorker = new Worker(
  "campaign-dispatch",
  async (job) => {
    const { campaignId } = job.data;

    const campaign = await Campaign.findById(campaignId)
      .populate("contactId")
      .populate("templateId");

    if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

    const { contactId: contact, templateId: template, extraJson } = campaign;

    const users = await User.find({
      _id: { $in: contact.userIds },
      isDeleted: false,
      isBanned: false,
    }).select("fullName userName email avatar bio skills");

    if (users.length === 0) {
      await Campaign.findByIdAndUpdate(campaignId, {
        status: "failed",
        "stats.total": 0,
      });
      throw new Error("No valid users in contact group");
    }

    // mark campaign sending
    await Campaign.findByIdAndUpdate(campaignId, {
      status: "sending",
      sentAt: new Date(),
      "stats.total": users.length,
      "stats.sent": 0,
      "stats.failed": 0,
    });

    // create pending CampaignJob docs
    const jobDocs = await CampaignJob.insertMany(
      users.map((user) => ({
        campaignId: campaign._id,
        userId: user._id,
        email: user.email,
        status: "pending",
      }))
    );

    // fan out to send queue
    await sendQueue.addBulk(
      users.map((user, i) => ({
        name: "send-email",
        data: {
          campaignId: campaignId.toString(),
          campaignJobId: jobDocs[i]._id.toString(),
          userId: user._id.toString(),
          templateId: template._id.toString(),
          extraJson,
        },
      }))
    );

    console.log(`✅ Dispatched ${users.length} send jobs for campaign ${campaignId}`);
  },
  {
    connection: bullRedis,
    concurrency: 1,
  }
);

// ─── Send Worker ──────────────────────────────────────────────
// One job per recipient → render liquid + send via Brevo

export const sendWorker = new Worker(
  "campaign-send",
  async (job) => {
    const { campaignId, campaignJobId, userId, templateId, extraJson } = job.data;

    const [user, template] = await Promise.all([
      User.findById(userId).select("fullName userName email avatar bio skills"),
      Template.findById(templateId),
    ]);

    if (!user || !template) throw new Error("User or template not found");

    // build liquid context
    let extra = extraJson ?? {};
    if (template.mode === "per_recipient" && Array.isArray(extraJson)) {
      extra = extraJson.find((e) => e.userId === userId) ?? {};
    }

    const context = buildContext(user, extra);

    const subjectSource = template.subject;
    const renderedSubject = await liquidEngine.parseAndRender(subjectSource, context);
    const renderedHtml = await liquidEngine.parseAndRender(template.htmlBody, context);

    const brevoRes = await sendBrevoEmail({
      to: user.email,
      subject: renderedSubject,
      html: renderedHtml,
    });

    // mark job sent
    await CampaignJob.findByIdAndUpdate(campaignJobId, {
      status: "sent",
      brevoMessageId: brevoRes.messageId || null,
      processedAt: new Date(),
    });

    // increment campaign sent count atomically
    await Campaign.findByIdAndUpdate(campaignId, {
      $inc: { "stats.sent": 1 },
    });
  },
  {
    connection: bullRedis,
    concurrency: 5, // 5 emails at a time — safe for Brevo rate limits
  }
);

// ─── Send Worker failure handler ──────────────────────────────

sendWorker.on("failed", async (job, err) => {
  if (!job) return;
  const { campaignJobId, campaignId } = job.data;

  await CampaignJob.findByIdAndUpdate(campaignJobId, {
    status: "failed",
    error: err.message,
    processedAt: new Date(),
  });

  await Campaign.findByIdAndUpdate(campaignId, {
    $inc: { "stats.failed": 1 },
  });

  console.error(`❌ Send job failed for campaign ${campaignId}:`, err.message);
});

// ─── Mark campaign done when all send jobs finish ─────────────

sendWorker.on("completed", async () => {
  // no-op here — we check in the SSE/progress endpoint
});

dispatchWorker.on("failed", async (job, err) => {
  if (!job) return;
  await Campaign.findByIdAndUpdate(job.data.campaignId, { status: "failed" });
  console.error("❌ Dispatch job failed:", err.message);
});

console.log("✅ BullMQ workers started");