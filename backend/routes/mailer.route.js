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
  getCampaignById,
  duplicateAndSendCampaign,
  retryFailedJobs,
  updateContact,
  getCampaignEmails,
  uploadTemplatePreview,
} from "../controller/mailer.controller.js";
import { deleteSuppressedEmail, getSuppressedEmailByEmail, getSuppressedEmails } from "../controller/unsubscribe.controller.js";
import { adminOnly, protectRoute } from "../middleware/protectRoute.middleware.js";
import { handlefileUpload } from "../middleware/multer.middleware.js";

const router = express.Router();

router.use(protectRoute, adminOnly);

// contacts
router.get("/contacts", getContacts);
router.post("/contacts", createContact);
router.delete("/contacts/:id", deleteContact);
router.put("/contacts/:id", updateContact);

// templates
router.get("/templates", getTemplates);
router.get("/templates/:id", getTemplateById);
router.post("/templates", createTemplate);
router.put("/templates/:id", updateTemplate);
router.delete("/templates/:id", deleteTemplate);
router.post("/templates/:id/preview", handlefileUpload("file"), uploadTemplatePreview);

// suppression list
router.get("/suppressed-emails", getSuppressedEmails);
router.get("/suppressed-emails/:email", getSuppressedEmailByEmail); 
router.delete("/suppressed-emails", deleteSuppressedEmail);


// campaigns
router.get("/campaigns", getCampaigns);
router.get("/campaigns/:id", getCampaignById);
router.get("/campaigns/:id/emails", getCampaignEmails);
router.post("/campaigns", createCampaign);
router.post("/campaigns/:id/send", sendCampaign);
router.post("/campaigns/:id/retry-failed", retryFailedJobs);
router.get("/campaigns/:id/jobs", getCampaignJobs);
router.delete("/campaigns/:id", deleteCampaign);
router.post("/campaigns/:id/duplicate", duplicateAndSendCampaign);

export default router;