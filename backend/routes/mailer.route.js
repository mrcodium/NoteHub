import express from "express";
import {
  getContacts,
  createContact,
  deleteContact,
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getCampaigns,
  createCampaign,
  sendCampaign,
  getCampaignJobs,
  deleteCampaign,
  getUsers,
  campaignProgress,
  getCampaignById,
} from "../controller/mailer.controller.js";

const router = express.Router();

// users
router.get("/users", getUsers);

// contacts
router.get("/contacts", getContacts);
router.post("/contacts", createContact);
router.delete("/contacts/:id", deleteContact);

// templates
router.get("/templates", getTemplates);
router.get("/templates/:id", getTemplateById);
router.post("/templates", createTemplate);
router.put("/templates/:id", updateTemplate);
router.delete("/templates/:id", deleteTemplate);

// campaigns
router.get("/campaigns", getCampaigns);
router.get("/campaigns/:id", getCampaignById);
router.post("/campaigns", createCampaign);
router.post("/campaigns/:id/send", sendCampaign);
router.get("/campaigns/:id/jobs", getCampaignJobs);
router.get("/campaigns/:id/progress", campaignProgress); // SSE
router.delete("/campaigns/:id", deleteCampaign);

export default router;