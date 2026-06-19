import express from "express";
import { searchUsers, searchNotes } from "../controllers/search.controllers.js";
const router = express.Router();

router.get("/users", searchUsers);
router.get("/notes", searchNotes);

export default router;
