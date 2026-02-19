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

router.post( "/upload-avatar", protectRoute, handlefileUpload("file"), uploadAvatar);
router.post( "/upload-cover", protectRoute, handlefileUpload("file"), uploadCover);
router.delete("/remove-avatar", protectRoute, removeAvatar);
router.delete("/remove-cover", protectRoute, removeCover);

router.put("/update-fullname", protectRoute, updateFullName);
router.put("/update-username", protectRoute, updateUserName);
router.post('/request-update-email-otp', protectRoute, requestEmailUpdateOtp);
router.post('/update-email', protectRoute, confirmEmailUpdate);

router.get("/me", protectRoute, checkAuth);
router.get("/:identifier", getUser);
router.get("/", protectRoute, adminOnly, getAllUsers);
router.get("/check-email/:email", isEmailAvailable);

export default router;
