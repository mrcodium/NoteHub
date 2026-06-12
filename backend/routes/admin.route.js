import express from "express";
import { protectRoute, adminOnly } from "../middleware/protectRoute.middleware.js";
import { handlefileUpload } from "../middleware/multer.middleware.js";
import linkGraphRoutes from "./linkGraph.route.js";
import gscRoutes from './gsc.route.js';
import * as adminController from "../controller/admin.controller.js";

const router = express.Router();

// All routes below require login + admin role
router.use(protectRoute, adminOnly);

router.use("/", linkGraphRoutes);
router.use('/gsc', gscRoutes);

router.get("/blogs", adminController.getAllBlogs);
router.get("/users", adminController.getAllUsers);
router.post("/users", adminController.createUser);
router.post("/users/batch", adminController.batchUpdateUsers);
router.get("/users/:userId", adminController.getUser);
router.patch("/users/:userId", adminController.updateUser);

// Session & Security Management
router.get("/users/:userId/sessions", adminController.getUserSessionsByAdmin);
router.delete("/users/:userId/sessions", adminController.terminateAllUserSessionsByAdmin);
router.delete("/users/:userId/sessions/:sessionId", adminController.terminateUserSessionByAdmin);
router.patch("/users/:userId/password", adminController.updateUserPasswordByAdmin);

// Photo Management (admin overrides for any user)
router.post("/users/:userId/avatar", handlefileUpload("file"), adminController.uploadUserAvatarByAdmin);
router.delete("/users/:userId/avatar", adminController.removeUserAvatarByAdmin);
router.post("/users/:userId/cover", handlefileUpload("file"), adminController.uploadUserCoverByAdmin);
router.delete("/users/:userId/cover", adminController.removeUserCoverByAdmin);

export default router;