import express from "express";
import { protectRoute } from "../middleware/protectRoute.middleware.js";
import {
    createNote,
    deleteNote,
    getNote,
    getPublicNotes,
    updateContent,
    renameNote,
    moveTo,
    getNoteBySlug,
    updateVisibility,
} from "../controller/note.controller.js";
import { requester } from "../middleware/requester.middleware.js";

const router = express.Router();

router.get('/',  getPublicNotes);
router.get('/:username/:collectionSlug/:noteSlug', requester, getNoteBySlug);
router.get('/:_id', protectRoute, getNote);

router.post('/', protectRoute, createNote);
router.delete('/:_id', protectRoute, deleteNote);
router.put('/', protectRoute, updateContent);
router.put('/rename', protectRoute, renameNote);
router.put('/update-visibility', protectRoute, updateVisibility);
router.post('/move-to', protectRoute, moveTo);

export default router;