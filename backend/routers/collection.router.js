import express from 'express';
import { protectRoute } from '../middleware/protectRoute.middleware.js';
import {
    createCollection,
    deleteCollection,
    renameCollection,
    getAllCollections,
    getCollection,
    updateVisibility,
    updateCollaborators,
} from '../controller/collection.controller.js';


const router = express.Router();
router.use(protectRoute);

router.post('/', protectRoute, createCollection);
router.delete('/:_id', protectRoute, deleteCollection);
router.put('/', protectRoute, renameCollection);
router.put('/update-visibility', protectRoute, updateVisibility);

router.get('/all-collections', getAllCollections);
router.get('/', getCollection);
router.put('/update-collaborators', updateCollaborators);

export default router;