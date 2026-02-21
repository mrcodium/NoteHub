import express from "express";
import {
    uploadAvatar,
    uploadCover,
    removeAvatar,
    removeCover,
    updateFullName,
    updateUserName,
    checkAuth,
    getUser,
    getAllUsers,
    isEmailAvailable,
    requestEmailUpdateOtp,
    confirmEmailUpdate,
} from "../controller/user.controller.js";
import { protectRoute, adminOnly } from "../middleware/protectRoute.middleware.js";
import { handlefileUpload } from "../middleware/multer.middleware.js";

const router = express.Router();

// public routes
router.get("/", getAllUsers);
router.get("/:identifier", getUser);
router.get("/check-email/:email", isEmailAvailable);


router.use(protectRoute);

router.post( "/upload-avatar", handlefileUpload("file"), uploadAvatar);
router.post( "/upload-cover", handlefileUpload("file"), uploadCover);
router.delete("/remove-avatar", removeAvatar);
router.delete("/remove-cover", removeCover);

router.put("/update-fullname", updateFullName);
router.put("/update-username", updateUserName);
router.post('/request-update-email-otp', requestEmailUpdateOtp);
router.post('/update-email', confirmEmailUpdate);

router.get("/me", checkAuth);

export default router;
