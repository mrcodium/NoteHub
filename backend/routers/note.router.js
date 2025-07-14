import express from "express";
import { protectRoute } from "../middleware/protectRoute.middleware.js";
import {
    createNote,
    deleteNote,
    getNote,
    getNotes,
    updateContent,
    renameNote,
    moveTo,
    getNoteBySlug
} from "../controller/note.controller.js";

const router = express.Router();

router.use(protectRoute);

router.get('/', protectRoute, getNotes);
router.get('/:username/:collectionSlug/:noteSlug', protectRoute, getNoteBySlug);
router.get('/:_id', protectRoute, getNote);
router.post('/', protectRoute, createNote);
router.delete('/:_id', protectRoute, deleteNote);
router.put('/', protectRoute, updateContent);
router.put('/rename', protectRoute, renameNote);
router.post('/move-to', protectRoute, moveTo);

export default router;