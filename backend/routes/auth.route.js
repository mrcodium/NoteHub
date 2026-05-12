import express from 'express';
import { 
    signup, 
    sendSignupOtp, 
    login, 
    googleLogin, 
    logout, 
    refresh,
    getSessions,
    logoutOthers,
    killSession
} from '../controller/auth.controller.js';
import { signupLimiter, loginLimiter } from "../middleware/rateLimiter.middleware.js";
import { protectRoute } from "../middleware/protectRoute.middleware.js";

const router = express.Router();

router.post('/signup', signup);
router.post('/send-signup-otp', sendSignupOtp);
router.post('/login', login);
router.post('/google-login', googleLogin);

// Protected logout (requires protectRoute to know which session to kill)
router.post('/logout', protectRoute, logout);

// Session management routes
router.post('/refresh', refresh); // Rate limit later if needed
router.get('/sessions', protectRoute, getSessions);
router.post('/logout-others', protectRoute, logoutOthers);
router.delete('/sessions/:sessionId', protectRoute, killSession);

export default router;
