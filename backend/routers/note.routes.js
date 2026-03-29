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

router.get('/', requester, getPublicNotes);
router.get('/search', requester, searchNotes);
router.get('/:username/:collectionSlug/:noteSlug', requester, getNoteBySlug);
router.get('/:_id', protectRoute, getNoteById);

router.post('/', protectRoute, createNote);
router.delete('/:_id', protectRoute, deleteNote);
router.put('/', protectRoute, updateContent);
router.put('/rename', protectRoute, renameNote);
router.put('/update-visibility', protectRoute, updateVisibility);
router.post('/move-to', protectRoute, moveTo);
router.put('/update-collaborators', protectRoute, updateCollaborators);

export default router;