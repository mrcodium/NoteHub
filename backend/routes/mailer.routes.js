import express from "express";
import * as mailer from "../controllers/mailer.controllers.js";
import { deleteSuppressedEmail, getSuppressedEmailByEmail, getSuppressedEmails } from "../controllers/unsubscribe.controllers.js";
import { adminOnly, protectRoute } from "../middleware/protectRoute.middleware.js";
import { handlefileUpload } from "../middleware/multer.middleware.js";

const router = express.Router();

router.use(protectRoute, adminOnly);

// contacts
router.get("/contacts", mailer.getContacts);
router.get("/contacts/:id/emails", mailer.getContactEmails);
router.post("/contacts", mailer.createContact);
router.delete("/contacts/:id", mailer.deleteContact);
router.put("/contacts/:id", mailer.updateContact);

// templates
router.get("/templates", mailer.getTemplates);
router.get("/templates/:id", mailer.getTemplateById);
router.post("/templates", mailer.createTemplate);
router.put("/templates/:id", mailer.updateTemplate);
router.delete("/templates/:id", mailer.deleteTemplate);
router.post("/templates/:id/preview", handlefileUpload("file"), mailer.uploadTemplatePreview);
router.post("/templates/bulk-delete", mailer.bulkDeleteTemplates);

// suppression list
router.get("/suppressed-emails", getSuppressedEmails);
router.get("/suppressed-emails/:email", getSuppressedEmailByEmail); 
router.delete("/suppressed-emails", deleteSuppressedEmail);

// campaigns
router.get("/campaigns", mailer.getCampaigns);
router.get("/campaigns/:id", mailer.getCampaignById);
router.get("/campaigns/:id/emails", mailer.getCampaignEmails);
router.post("/campaigns", mailer.createCampaign);
router.put("/campaigns/:id", mailer.updateCampaign);
router.post("/campaigns/:id/send", mailer.sendCampaign);
router.post("/campaigns/:id/retry-failed", mailer.retryFailedJobs);
router.get("/campaigns/:id/jobs", mailer.getCampaignJobs);
router.delete("/campaigns/:id", mailer.deleteCampaign);
router.post("/campaigns/:id/duplicate", mailer.duplicateCampaign);
router.post("/campaigns/bulk-delete", mailer.bulkDeleteCampaigns);
router.post("/campaigns/bulk-retry-failed", mailer.bulkRetryFailedJobs);

export default router;