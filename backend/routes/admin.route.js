import express from "express";
import { protectRoute, adminOnly } from "../middleware/protectRoute.middleware.js";
import { handlefileUpload } from "../middleware/multer.middleware.js";
import { 
  getAllUsers, 
  getUser, 
  updateUser, 
  batchUpdateUsers,
  createUser,
  getUserSessionsByAdmin,
  terminateUserSessionByAdmin,
  terminateAllUserSessionsByAdmin,
  updateUserPasswordByAdmin,
  uploadUserAvatarByAdmin,
  removeUserAvatarByAdmin,
  uploadUserCoverByAdmin,
  removeUserCoverByAdmin,
} from "../controller/admin.controller.js";

const router = express.Router();

// All routes below require login + admin role
router.use(protectRoute, adminOnly);

router.get("/users", getAllUsers);
router.post("/users", createUser);
router.post("/users/batch", batchUpdateUsers);
router.get("/users/:userId", getUser);
router.patch("/users/:userId", updateUser);

// Session & Security Management
router.get("/users/:userId/sessions", getUserSessionsByAdmin);
router.delete("/users/:userId/sessions", terminateAllUserSessionsByAdmin);
router.delete("/users/:userId/sessions/:sessionId", terminateUserSessionByAdmin);
router.patch("/users/:userId/password", updateUserPasswordByAdmin);

// Photo Management (admin overrides for any user)
router.post("/users/:userId/avatar", handlefileUpload("file"), uploadUserAvatarByAdmin);
router.delete("/users/:userId/avatar", removeUserAvatarByAdmin);
router.post("/users/:userId/cover", handlefileUpload("file"), uploadUserCoverByAdmin);
router.delete("/users/:userId/cover", removeUserCoverByAdmin);

export default router;