import Contact from "../model/contact.model.js";
import Template from "../model/template.model.js";
import Campaign from "../model/campaign.model.js";
import CampaignJob from "../model/campaignJob.model.js";
import User from "../model/user.model.js";
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
    const { label, userIds, description } = req.body;
    const contact = await Contact.create({ label, userIds, description });
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
    const campaigns = await Campaign.find()
      .populate("templateId", "name subject")
      .populate("contactId", "label")
      .sort({ createdAt: -1 });
    res.json({ success: true, campaigns });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCampaignById = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate("templateId", "name subject htmlBody mode")
      .populate("contactId", "label userIds description");
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
    const { name, templateId, contactId, extraJson, subject } = req.body;
    const campaign = await Campaign.create({
      name,
      templateId,
      contactId,
      extraJson: extraJson || {},
      subject: subject || "",
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

    // add to dispatch queue — returns immediately
    await dispatchQueue.add("dispatch", { campaignId: campaign._id.toString() });

    res.json({ success: true, message: "Campaign queued" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── SSE: real-time campaign progress ────────────────────────

export const campaignProgress = async (req, res) => {
  const { id } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const tick = async () => {
    try {
      const campaign = await Campaign.findById(id).select("status stats");
      if (!campaign) { send({ error: "Not found" }); return true; }

      const { stats, status } = campaign;

      // count actual job states from DB — source of truth
      const [sentCount, failedCount] = await Promise.all([
        CampaignJob.countDocuments({ campaignId: id, status: "sent" }),
        CampaignJob.countDocuments({ campaignId: id, status: "failed" }),
      ]);

      const processedStats = {
        total: stats.total,
        sent: sentCount,
        failed: failedCount,
      };

      send({ status, stats: processedStats });

      // finalize if all jobs processed
      if (
        stats.total > 0 &&
        sentCount + failedCount >= stats.total
      ) {
        const finalStatus = failedCount === stats.total ? "failed" : "done";
        await Campaign.findByIdAndUpdate(id, {
          status: finalStatus,
          "stats.sent": sentCount,
          "stats.failed": failedCount,
        });
        send({ status: finalStatus, stats: processedStats });
        return true;
      }

      if (status === "done" || status === "failed") return true;
      return false;
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

  req.on("close", () => { clearInterval(interval); });
};

export const getCampaignJobs = async (req, res) => {
  try {
    const jobs = await CampaignJob.find({ campaignId: req.params.id })
      .populate("userId", "fullName userName email avatar")
      .sort({ createdAt: 1 });
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

// ─── USERS (for contact builder) ─────────────────────────────

export const getUsers = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 20 } = req.query;
    const query = {
      isDeleted: false,
      isBanned: false,
      ...(search && {
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { userName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }),
    };

    const users = await User.find(query)
      .select("fullName userName email avatar")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await User.countDocuments(query);
    res.json({ success: true, users, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};