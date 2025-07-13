import express from 'express';
import { protectRoute } from '../middleware/protectRoute.middleware.js';
import {
    createCollection,
    deleteCollection,
    renameCollection,
    getCollections,
} from '../controller/collection.controller.js';


const router = express.Router();
router.use(protectRoute);

router.post('/', createCollection);
router.delete('/:_id', deleteCollection);
router.get('/hierarchy', getCollections);
router.put('/', renameCollection);

export default router;