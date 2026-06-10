import Campaign from "../model/campaign.model.js";
import CampaignJob from "../model/campaignJob.model.js";
import Contact from "../model/contact.model.js";
import Template from "../model/template.model.js";
import { dispatchQueue, sendQueue } from "../queues/campaign.queue.js";
import { uploadStream } from "../services/cloudinary.service.js";
import { getPagination, paginationMeta } from "../utils/pagination.js";
import { handleDbError } from "../utils/dbError.js";

// ─── CONTACTS ────────────────────────────────────────────────

export const getContacts = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [contacts, total] = await Promise.all([
      Contact.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Contact.countDocuments(),
    ]);
    res.json({
      success: true,
      contacts,
      pagination: paginationMeta(total, page, limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createContact = async (req, res) => {
  try {
    const { label, emails } = req.body;
    const contact = await Contact.create({ label, emails });
    res.status(201).json({ success: true, contact });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteContact = async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// controllers/mailer.controller.js
export const updateContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, emails } = req.body;

    const contact = await Contact.findById(id);
    if (!contact) {
      return res.status(404).json({ message: "Contact group not found" });
    }

    if (label !== undefined) {
      if (!label.trim()) {
        return res.status(400).json({ message: "Label cannot be empty" });
      }
      contact.label = label.trim();
    }

    if (emails !== undefined) {
      if (!Array.isArray(emails) || emails.length === 0) {
        return res
          .status(400)
          .json({ message: "At least one email is required" });
      }

      // Sanitize and deduplicate
      const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const cleaned = [
        ...new Set(
          emails
            .map((e) => e.trim().toLowerCase())
            .filter((e) => EMAIL_REGEX.test(e)),
        ),
      ];

      if (cleaned.length === 0) {
        return res.status(400).json({ message: "No valid emails provided" });
      }

      contact.emails = cleaned;
    }

    await contact.save();

    res.status(200).json({ message: "Contact group updated", contact });
  } catch (error) {
    console.error("updateContact error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── TEMPLATES ───────────────────────────────────────────────

export const getTemplates = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [templates, total] = await Promise.all([
      Template.find()
        .select("-htmlBody")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Template.countDocuments(),
    ]);
    res.json({
      success: true,
      templates,
      pagination: paginationMeta(total, page, limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTemplateById = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    res.json({ success: true, template });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createTemplate = async (req, res) => {
  try {
    const { name, subject, htmlBody, previewText, mode } = req.body;
    const template = await Template.create({
      name,
      subject,
      htmlBody,
      previewText,
      mode,
    });
    res.status(201).json({ success: true, template });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateTemplate = async (req, res) => {
  try {
    const template = await Template.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json({ success: true, template });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteTemplate = async (req, res) => {
  try {
    await Template.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const uploadTemplatePreview = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) return res.status(400).json({ message: "No file uploaded" });

    const template = await Template.findById(id);
    if (!template) return res.status(404).json({ message: "Template not found" });

    // Delete old preview if exists
    if (template.previewImage) {
      await deleteImage(template.previewImage);
    }

    const { secure_url } = await uploadStream(
      file.buffer,
      "notehub/template-previews",
      "template_preview",
      file
    );

    template.previewImage = secure_url;
    await template.save();

    return res.status(200).json({ previewUrl: secure_url });
  } catch (error) {
    console.error("Template preview upload error:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

// ─── CAMPAIGNS ───────────────────────────────────────────────

export const getCampaigns = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [campaigns, total] = await Promise.all([
      Campaign.find()
        .select("-emails -htmlBody -subject -previewText")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Campaign.countDocuments(),
    ]);
    res.json({
      success: true,
      campaigns,
      pagination: paginationMeta(total, page, limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCampaignEmails = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id).select("emails");
    if (!campaign) return res.status(404).json({ success: false, message: "Campaign not found" });
    res.json({ success: true, emails: campaign.emails });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCampaignById = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign)
      return res
        .status(404)
        .json({ success: false, message: "Campaign not found" });
    res.json({ success: true, campaign });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createCampaign = async (req, res) => {
  try {
    const { name, subject, htmlBody, previewText, emails, extraJson } =
      req.body;

    if (!name?.trim())
      return res
        .status(400)
        .json({ success: false, message: "Name is required" });
    if (!subject?.trim())
      return res
        .status(400)
        .json({ success: false, message: "Subject is required" });
    if (!htmlBody?.trim())
      return res
        .status(400)
        .json({ success: false, message: "HTML body is required" });

    // Derive final email list — per-recipient array takes priority
    let resolvedEmails = Array.isArray(emails) ? emails : [];
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
      if (derived.length > 0) resolvedEmails = derived;
    }

    if (resolvedEmails.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one recipient is required",
      });
    }

    const campaign = await Campaign.create({
      name: name.trim(),
      subject: subject.trim(),
      htmlBody,
      previewText,
      emails: resolvedEmails,
      extraJson: extraJson ?? {},
      status: "draft",
    });

    res.status(201).json({ success: true, campaign });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const sendCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign)
      return res
        .status(404)
        .json({ success: false, message: "Campaign not found" });
    if (campaign.status === "sending")
      return res
        .status(400)
        .json({ success: false, message: "Campaign already sending" });
    if (campaign.status === "done")
      return res
        .status(400)
        .json({ success: false, message: "Campaign already sent" });

    await dispatchQueue.add("dispatch", {
      campaignId: campaign._id.toString(),
    });

    res.json({ success: true, message: "Campaign queued" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCampaignJobs = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = { campaignId: req.params.id };
    const [jobs, total] = await Promise.all([
      CampaignJob.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit),
      CampaignJob.countDocuments(filter),
    ]);
    res.json({
      success: true,
      jobs,
      pagination: paginationMeta(total, page, limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteCampaign = async (req, res) => {
  try {
    await Campaign.findByIdAndDelete(req.params.id);
    await CampaignJob.deleteMany({ campaignId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const duplicateAndSendCampaign = async (req, res) => {
  try {
    const original = await Campaign.findById(req.params.id);
    if (!original)
      return res
        .status(404)
        .json({ success: false, message: "Campaign not found" });

    const campaign = await Campaign.create({
      name: `${original.name} (Resend)`,
      subject: original.subject,
      htmlBody: original.htmlBody,
      previewText: original?.previewText || "",
      emails: original.emails,
      extraJson: original.extraJson,
      status: "draft",
    });

    await dispatchQueue.add("dispatch", {
      campaignId: campaign._id.toString(),
    });

    campaign.status = "sending";
    await campaign.save();

    res.status(201).json({ success: true, campaign });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const retryFailedJobs = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign)
      return res
        .status(404)
        .json({ success: false, message: "Campaign not found" });
    if (campaign.status === "sending")
      return res
        .status(400)
        .json({ success: false, message: "Campaign is already sending" });

    const failedJobs = await CampaignJob.find({
      campaignId: campaign._id,
      status: "failed",
    });

    if (failedJobs.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "No failed jobs to retry" });

    // Reset failed jobs back to pending
    await CampaignJob.updateMany(
      { campaignId: campaign._id, status: "failed" },
      { $set: { status: "pending", error: null, processedAt: null } },
    );

    // Adjust campaign stats: move failed count back, keep total intact
    await Campaign.findByIdAndUpdate(campaign._id, {
      status: "sending",
      $inc: { "stats.failed": -failedJobs.length },
    });

    // Re-queue only the failed jobs into sendQueue
    await sendQueue.addBulk(
      failedJobs.map((job) => ({
        name: "send-email",
        data: {
          campaignId: campaign._id.toString(),
          campaignJobId: job._id.toString(),
          email: job.email,
          subject: campaign.subject,
          htmlBody: campaign.htmlBody,
          extraJson: Array.isArray(campaign.extraJson)
            ? (campaign.extraJson.find(
                (e) =>
                  typeof e.email === "string" &&
                  e.email.trim().toLowerCase() === job.email,
              ) ?? {})
            : (campaign.extraJson ?? {}),
        },
      })),
    );

    res.json({
      success: true,
      message: `Retrying ${failedJobs.length} failed jobs`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
