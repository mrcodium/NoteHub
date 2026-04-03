import express from "express";
import { protectRoute } from "../middleware/protectRoute.middleware.js";
import {
    createNote,
    deleteNote,
    getNoteById,
    getPublicNotes,
    updateContent,
    renameNote,
    moveTo,
    getNoteBySlug,
    updateVisibility,
    updateCollaborators,
    searchNotes,
} from "../controller/note.controller.js";
import { requester } from "../middleware/requester.middleware.js";

const router = express.Router();

// public routes
router.get('/', requester, getPublicNotes);
router.get('/search', requester, searchNotes);
router.get('/:username/:collectionSlug/:noteSlug', requester, getNoteBySlug);

// protected routes 
router.use(protectRoute);

router.get('/:_id', getNoteById);
router.post('/', createNote);
router.delete('/:_id', deleteNote);
router.put('/', updateContent);
router.put('/rename', renameNote);
router.put('/update-visibility', updateVisibility);
router.post('/move-to', moveTo);
router.put('/update-collaborators', updateCollaborators);

export default router;