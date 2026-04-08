import express from "express";
import { protectRoute, adminOnly } from "../middleware/protectRoute.middleware.js";
import { getAllUsers, getUser, updateUser } from "../controller/admin.controller.js";

const router = express.Router();

// All routes below require login + admin role
router.use(protectRoute, adminOnly);

router.get("/users", getAllUsers);
router.get("/users/:userId", getUser);
router.patch("/users/:userId", updateUser);

export default router;