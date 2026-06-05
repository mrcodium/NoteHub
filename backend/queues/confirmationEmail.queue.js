// queues/confirmationEmail.queue.js

import { Queue, Worker } from "bullmq";
import { bullRedis } from "../config/bullmq.config.js";
import { sendEmail } from "../services/sendEmail.js";
import { contactConfirmationTemplate } from "../services/emailTemplates.js";

export const confirmationEmailQueue = new Queue(
  "confirmation-email",
  {
    connection: bullRedis,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 100,
    },
  }
);

// workers

export const confirmationEmailWorker = new Worker(
  "confirmation-email",
  async (job) => {
    const {
      email,
      name,
      reason,
      message,
    } = job.data;

    const confirmationText = `
Hello ${name},

Thank you for contacting NoteHub.

We've successfully received your message regarding "${reason}".

Our team will review it and get back to you as soon as possible.

Best regards,
Abhijeet
NoteHub
`;

    await sendEmail({
      email,
      subject: "We've received your message — NoteHub",
      text: confirmationText,
      html: contactConfirmationTemplate({
        from_name: name,
        reason,
        message,
      }),
    });

    console.log(`✅ Confirmation email sent to ${email}`);
  },
  {
    connection: bullRedis,
    concurrency: 5,
  }
);

confirmationEmailWorker.on("failed", (job, err) => {
  console.error(
    `❌ Confirmation email failed for ${job?.data?.email}`,
    err.message
  );
});