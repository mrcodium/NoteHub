import Campaign from "../model/campaign.model.js";
import CampaignJob from "../model/campaignJob.model.js";
import Contact from "../model/contact.model.js";
import Template from "../model/template.model.js";
import { dispatchQueue } from "../queues/campaign.queue.js";

// ─── CONTACTS ────────────────────────────────────────────────

export const getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json({ success: true, contacts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createContact = async (req, res) => {
  try {
    const { label, emails, description } = req.body;
    const contact = await Contact.create({ label, emails, description });
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

// ─── TEMPLATES ───────────────────────────────────────────────

export const getTemplates = async (req, res) => {
  try {
    const templates = await Template.find().sort({ createdAt: -1 });
    res.json({ success: true, templates });
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
    const template = await Template.create({ name, subject, htmlBody, previewText, mode });
    res.status(201).json({ success: true, template });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateTemplate = async (req, res) => {
  try {
    const template = await Template.findByIdAndUpdate(req.params.id, req.body, { new: true });
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

// ─── CAMPAIGNS ───────────────────────────────────────────────

export const getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    res.json({ success: true, campaigns });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCampaignById = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign)
      return res.status(404).json({ success: false, message: "Campaign not found" });
    res.json({ success: true, campaign });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createCampaign = async (req, res) => {
  try {
    const { name, subject, htmlBody, emails, extraJson } = req.body;

    if (!name?.trim()) return res.status(400).json({ success: false, message: "Name is required" });
    if (!subject?.trim()) return res.status(400).json({ success: false, message: "Subject is required" });
    if (!htmlBody?.trim()) return res.status(400).json({ success: false, message: "HTML body is required" });

    // Derive final email list — per-recipient array takes priority
    let resolvedEmails = Array.isArray(emails) ? emails : [];
    if (Array.isArray(extraJson) && extraJson.length > 0) {
      const derived = [
        ...new Set(
          extraJson
            .map((e) => (typeof e.email === "string" ? e.email.trim().toLowerCase() : null))
            .filter(Boolean)
        ),
      ];
      if (derived.length > 0) resolvedEmails = derived;
    }

    if (resolvedEmails.length === 0) {
      return res.status(400).json({ success: false, message: "At least one recipient is required" });
    }

    const campaign = await Campaign.create({
      name: name.trim(),
      subject: subject.trim(),
      htmlBody,
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
      return res.status(404).json({ success: false, message: "Campaign not found" });
    if (campaign.status === "sending")
      return res.status(400).json({ success: false, message: "Campaign already sending" });
    if (campaign.status === "done")
      return res.status(400).json({ success: false, message: "Campaign already sent" });

    await dispatchQueue.add("dispatch", { campaignId: campaign._id.toString() });

    res.json({ success: true, message: "Campaign queued" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── SSE: real-time campaign progress (pure reader) ──────────
// Status is set by the worker — this just streams whatever the DB says.

export const campaignProgress = async (req, res) => {
  const { id } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const tick = async () => {
    try {
      const campaign = await Campaign.findById(id).select("status stats");
      if (!campaign) {
        send({ error: "Not found" });
        return true;
      }

      send({ status: campaign.status, stats: campaign.stats });

      // Stop streaming once terminal state is reached
      return campaign.status === "done" || campaign.status === "failed";
    } catch {
      return true;
    }
  };

  const done = await tick();
  if (done) { res.end(); return; }

  const interval = setInterval(async () => {
    const done = await tick();
    if (done) {
      clearInterval(interval);
      res.end();
    }
  }, 1500);

  req.on("close", () => clearInterval(interval));
};

export const getCampaignJobs = async (req, res) => {
  try {
    const jobs = await CampaignJob.find({ campaignId: req.params.id }).sort({ createdAt: 1 });
    res.json({ success: true, jobs });
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
      return res.status(404).json({ success: false, message: "Campaign not found" });

    const campaign = await Campaign.create({
      name: `${original.name} (Resend)`,
      subject: original.subject,
      htmlBody: original.htmlBody,
      emails: original.emails,
      extraJson: original.extraJson,
      status: "draft",
    });

    await dispatchQueue.add("dispatch", { campaignId: campaign._id.toString() });

    campaign.status = "sending";
    await campaign.save();

    res.status(201).json({ success: true, campaign });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};