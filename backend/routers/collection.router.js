import express from 'express';
import { protectRoute } from '../middleware/protectRoute.middleware.js';
import {
    createCollection,
    deleteCollection,
    renameCollection,
    getAllCollections,
    getCollection,
} from '../controller/collection.controller.js';


const router = express.Router();
router.use(protectRoute);

router.post('/', createCollection);
router.delete('/:_id', deleteCollection);
router.put('/', renameCollection);
router.get('/all-collections', getAllCollections);
router.get('/', getCollection);

export default router;