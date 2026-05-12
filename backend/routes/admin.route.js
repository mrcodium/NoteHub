import express from "express";
import { protectRoute, adminOnly } from "../middleware/protectRoute.middleware.js";
import { 
  getAllUsers, 
  getUser, 
  updateUser, 
  batchUpdateUsers,
  getUserSessionsByAdmin,
  terminateUserSessionByAdmin,
  terminateAllUserSessionsByAdmin,
  updateUserPasswordByAdmin
} from "../controller/admin.controller.js";

const router = express.Router();

// All routes below require login + admin role
router.use(protectRoute, adminOnly);

router.get("/users", getAllUsers);
router.post("/users/batch", batchUpdateUsers);
router.get("/users/:userId", getUser);
router.patch("/users/:userId", updateUser);

// Session & Security Management
router.get("/users/:userId/sessions", getUserSessionsByAdmin);
router.delete("/users/:userId/sessions", terminateAllUserSessionsByAdmin);
router.delete("/users/:userId/sessions/:sessionId", terminateUserSessionByAdmin);
router.patch("/users/:userId/password", updateUserPasswordByAdmin);

export default router;