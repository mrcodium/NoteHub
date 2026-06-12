import express from 'express';
import { getGscAuthUrl, gscCallback, getGscHealth } from '../controller/gsc.controller.js';

const router = express.Router();

router.get('/auth',     getGscAuthUrl);
router.get('/callback', gscCallback);
router.get('/health',   getGscHealth);

export default router;