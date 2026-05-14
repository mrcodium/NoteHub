import express from "express";
import { 
    connectGithub, 
    githubCallback, 
    disconnectGithub, 
    getGithubContributions 
} from "../controller/github.controller.js";
import { protectRoute } from "../middleware/protectRoute.middleware.js";

const router = express.Router();

router.get("/connect", protectRoute, connectGithub);
router.get("/callback", protectRoute, githubCallback);
router.post("/disconnect", protectRoute, disconnectGithub);
router.get("/contributions/:username", getGithubContributions);

export default router;
