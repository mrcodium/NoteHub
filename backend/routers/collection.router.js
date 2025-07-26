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

router.get('/all-collections', requester, getAllCollections);
router.get('/', requester, getCollection);

router.delete('/:_id', protectRoute, deleteCollection);

router.post('/', protectRoute, createCollection);
router.put('/', protectRoute, renameCollection);
router.put('/update-visibility', protectRoute, updateVisibility);
router.put('/update-collaborators', protectRoute, updateCollaborators);


export default router;