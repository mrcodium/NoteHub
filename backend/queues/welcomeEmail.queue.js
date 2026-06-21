import { Queue, Worker } from "bullmq";
import { bullRedis } from "../config/bullmq.config.js";
import { sendBrevoEmail } from "../services/mailer.service.js";
import Template from "../models/template.model.js";
import { Liquid } from "liquidjs";
import { TEMPLATE_GLOBALS } from "../utils/mailer-global.js";

const liquidEngine = new Liquid({
  strictFilters: false,
  strictVariables: false,
});

// ─── Queue ────────────────────────────────────────────────────

export const welcomeEmailQueue = new Queue("welcome-email", {
  connection: bullRedis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});

// ─── Worker ───────────────────────────────────────────────────

export const welcomeEmailWorker = new Worker(
  "welcome-email",
  async (job) => {
    const { email, name } = job.data;

    // Fetch the welcome template from DB by slug (or _id — your call)
    const template = await Template.findOne({ slug: "welcome" }).lean();
    if (!template) throw new Error("Welcome email template not found");

    const ctx = {
      ...TEMPLATE_GLOBALS,
      extra: { name, email },
    };

    const renderedSubject = await liquidEngine.parseAndRender(
      template.subject,
      ctx,
    );
    const renderedHtml = await liquidEngine.parseAndRender(
      template.htmlBody,
      ctx,
    );
    const renderedPreviewText = await liquidEngine.parseAndRender(
      template.previewText || "",
      ctx,
    );

    await sendBrevoEmail({
      to: email,
      subject: renderedSubject,
      html: renderedHtml,
      previewText: renderedPreviewText,
    });

    console.log(`✅ Welcome email sent to ${email}`);
  },
  {
    connection: bullRedis,
    concurrency: 5,
  },
);

welcomeEmailWorker.on("failed", (job, err) => {
  console.error(
    `❌ Welcome email failed for ${job?.data?.email} (attempt ${job?.attemptsMade}):`,
    err.message,
  );
});