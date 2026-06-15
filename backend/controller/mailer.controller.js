import Campaign from "../model/campaign.model.js";
import CampaignJob from "../model/campaignJob.model.js";
import Contact from "../model/contact.model.js";
import Template from "../model/template.model.js";
import { dispatchQueue, sendQueue, setCampaignCache } from "../queues/campaign.queue.js";
import { deleteImage, uploadStream } from "../services/cloudinary.service.js";
import { getPagination, paginationMeta } from "../utils/pagination.js";
import { handleDbError } from "../utils/dbError.js";

// ─── CONTACTS ────────────────────────────────────────────────

export const getContacts = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [contacts, total] = await Promise.all([
      Contact.aggregate([
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            label: 1,
            createdAt: 1,
            updatedAt: 1,
            emailCount: { $size: "$emails" },
          },
        },
      ]),
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

export const getContactEmails = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id).select("emails");
    if (!contact) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, emails: contact.emails });
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
    const template = await Template.findByIdAndDelete(req.params.id);

    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found" });
    }

    if (template.previewImage) {
      await deleteImage(template.previewImage);
    }

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
    if (!template)
      return res.status(404).json({ message: "Template not found" });

    // Delete old preview if exists
    if (template.previewImage) {
      await deleteImage(template.previewImage);
    }

    const { secure_url } = await uploadStream(
      file.buffer,
      "notehub/template-previews",
      "template_preview",
      file,
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

export const bulkDeleteTemplates = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ success: false, message: "No template IDs provided" });

    const result = await Template.deleteMany({ _id: { $in: ids } });

    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── CAMPAIGNS ───────────────────────────────────────────────

export const getCampaigns = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [campaigns, total] = await Promise.all([
      Campaign.find()
        .select("-emails -htmlBody -subject -previewText -extraJson")
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
    if (!campaign)
      return res
        .status(404)
        .json({ success: false, message: "Campaign not found" });
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

export const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject, htmlBody, previewText, emails, extraJson } = req.body;

    const campaign = await Campaign.findById(id);
    if (!campaign)
      return res.status(404).json({ success: false, message: "Campaign not found" });

    if (campaign.status !== "draft")
      return res.status(400).json({
        success: false,
        message: `Cannot update campaign with status "${campaign.status}"`,
      });

    if (name !== undefined) {
      if (!name?.trim())
        return res.status(400).json({ success: false, message: "Name is required" });
      campaign.name = name.trim();
    }

    if (subject !== undefined) {
      if (!subject?.trim())
        return res.status(400).json({ success: false, message: "Subject is required" });
      campaign.subject = subject.trim();
    }

    if (htmlBody !== undefined) {
      if (!htmlBody?.trim())
        return res.status(400).json({ success: false, message: "HTML body is required" });
      campaign.htmlBody = htmlBody;
    }

    if (previewText !== undefined) campaign.previewText = previewText;

    if (emails !== undefined || extraJson !== undefined) {
      let resolvedEmails = Array.isArray(emails) ? emails : campaign.emails;
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

      if (resolvedEmails.length === 0)
        return res.status(400).json({
          success: false,
          message: "At least one recipient is required",
        });

      campaign.emails = resolvedEmails;
      if (extraJson !== undefined) campaign.extraJson = extraJson;
    }

    await campaign.save();
    res.status(200).json({ success: true, campaign });
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
  const ALLOWED_SORT_FIELDS = new Set(["createdAt", "processedAt", "email", "openCount"]);

  try {
    const { page, limit, skip } = getPagination(req.query);
    const { status, sortBy = "createdAt", sortOrder = "asc" } = req.query;

    const filter = { campaignId: req.params.id };
    if (status) filter.status = status; // single value: "failed"
    // multi-status: ?status=sent,failed → filter.status = { $in: ["sent", "failed"] }

    const safeSort = ALLOWED_SORT_FIELDS.has(sortBy) ? sortBy : "createdAt";
    const order = sortOrder === "desc" ? -1 : 1;

    const [jobs, total] = await Promise.all([
      CampaignJob.find(filter)
        .sort({ [safeSort]: order })
        .skip(skip)
        .limit(limit),
      CampaignJob.countDocuments(filter),
    ]);

    res.json({ success: true, jobs, pagination: paginationMeta(total, page, limit) });
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

export const duplicateCampaign = async (req, res) => {
  try {
    const original = await Campaign.findById(req.params.id);
    if (!original)
      return res
        .status(404)
        .json({ success: false, message: "Campaign not found" });

    // Strip any existing "(copy-n)" suffix to get the base name
    const baseName = original.name.replace(/\s*\(copy-\d+\)$/i, "");

    // Find existing copies of this base name to determine next number
    const existingCopies = await Campaign.find({
      name: { $regex: `^${baseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s\\(copy-\\d+\\)$`, $options: "i" },
    }).select("name");

    let maxN = 0;
    for (const c of existingCopies) {
      const match = c.name.match(/\(copy-(\d+)\)$/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxN) maxN = n;
      }
    }

    const newName = `${baseName} (copy-${maxN + 1})`;

    const campaign = await Campaign.create({
      name: newName,
      subject: original.subject,
      htmlBody: original.htmlBody,
      previewText: original?.previewText || "",
      emails: original.emails,
      extraJson: original.extraJson,
      status: "draft",
    });

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

// ------------ Campaign BULK ACIONS
export const bulkDeleteCampaigns = async (req, res) => {
  try {
    const { ids } = req.body; // array of campaign IDs

    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ success: false, message: "No campaign IDs provided" });

    // Optional: prevent deleting campaigns currently sending
    const sendingCampaigns = await Campaign.find({
      _id: { $in: ids },
      status: "sending",
    }).select("_id");

    if (sendingCampaigns.length > 0)
      return res.status(400).json({
        success: false,
        message: "Cannot delete campaigns that are currently sending",
      });

    await Campaign.deleteMany({ _id: { $in: ids } });
    await CampaignJob.deleteMany({ campaignId: { $in: ids } });

    res.json({ success: true, deletedCount: ids.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


export const bulkRetryFailedJobs = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ success: false, message: "No campaign IDs provided" });

    // 1. Fetch all eligible campaigns in one go
    const campaigns = await Campaign.find({
      _id: { $in: ids },
      status: "failed",
    }).select("_id subject htmlBody previewText extraJson").lean();

    if (campaigns.length === 0)
      return res.status(400).json({ success: false, message: "No eligible campaigns" });

    const campaignMap = new Map(campaigns.map((c) => [c._id.toString(), c]));
    const eligibleIds = campaigns.map((c) => c._id);

    // 2. Fetch all failed jobs across these campaigns in one query
    const failedJobs = await CampaignJob.find({
      campaignId: { $in: eligibleIds },
      status: "failed",
    }).select("_id campaignId email").lean();

    if (failedJobs.length === 0)
      return res.status(400).json({ success: false, message: "No failed jobs to retry" });

    // 3. Group failed counts per campaign
    const failedCountByCampaign = {};
    for (const job of failedJobs) {
      const cid = job.campaignId.toString();
      failedCountByCampaign[cid] = (failedCountByCampaign[cid] || 0) + 1;
    }

    // 4. Bulk reset all failed jobs -> pending (single query)
    await CampaignJob.updateMany(
      { campaignId: { $in: eligibleIds }, status: "failed" },
      { $set: { status: "pending", error: null, processedAt: null } },
    );

    // 5. Bulk update campaign stats + status (one bulkWrite instead of N updates)
    const campaignBulkOps = Object.entries(failedCountByCampaign).map(([cid, count]) => ({
      updateOne: {
        filter: { _id: cid },
        update: { $set: { status: "sending" }, $inc: { "stats.failed": -count } },
      },
    }));
    await Campaign.bulkWrite(campaignBulkOps);

    // 6. Warm campaign cache so sendWorker doesn't hit DB per job
    for (const campaign of campaigns) {
      const isPerRecipient =
        Array.isArray(campaign.extraJson) && campaign.extraJson.length > 0;
      setCampaignCache(campaign._id, campaign, isPerRecipient);
    }

    // 7. Build lightweight queue jobs (worker reads campaign data from cache)
    const queueJobs = failedJobs.map((job) => ({
      name: "send-email",
      data: {
        campaignId: job.campaignId.toString(),
        campaignJobId: job._id.toString(),
        email: job.email,
      },
    }));

    await sendQueue.addBulk(queueJobs);

    res.json({
      success: true,
      retriedCampaigns: campaigns.length,
      retriedJobs: failedJobs.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};