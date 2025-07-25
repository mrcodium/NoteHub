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
import { requester } from '../middleware/requester.middleware.js';


const router = express.Router();

router.post('/', protectRoute, createCollection);
router.delete('/:_id', protectRoute, deleteCollection);
router.put('/', protectRoute, renameCollection);
router.put('/update-visibility', protectRoute, updateVisibility);

router.get('/all-collections', requester, getAllCollections);
router.get('/', requester, getCollection);
router.put('/update-collaborators', protectRoute, updateCollaborators);

export default router;