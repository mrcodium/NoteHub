import mongoose from "mongoose";
import Note from "../model/note.model.js";
import Collection from "../model/collection.model.js";
import SearchIndex from "../model/searchIndex.model.js";
import User from "../model/user.model.js";
import { canAccessNote } from "../utils/permissions.js";
import {
  extractKeywords,
  normalizeText,
} from "../services/indexer/textProcessor.js";
import { updateIndex } from "../services/indexer/updateIndex.js";

export const createNote = async (req, res) => {
  const {
    name,
    collectionId,
    content = "",
    visibility = "public",
    collaborators,
  } = req.body;
  const { user } = req;

  if (!user) {
    return res.status(401).json({ message: "Unauthorized: User not found" });
  }

  if (!name || !collectionId) {
    return res
      .status(400)
      .json({ message: "Name and collection ID are required" });
  }

  try {
    // 1️⃣ Create note
    const note = await Note.create({
      name,
      content,
      collectionId,
      visibility,
      collaborators: collaborators || [],
      userId: user._id,
    });

    // 2️⃣ Extract keywords from title + content
    const keywords = extractKeywords(`${name} ${content}`);

    // 3️⃣ Index note
    if (keywords.length) {
      const ops = keywords.map((lemma) => ({
        updateOne: {
          filter: { lemma },
          update: { $addToSet: { noteIds: note._id } },
          upsert: true,
        },
      }));

      await SearchIndex.bulkWrite(ops);
    }

    return res.status(201).json({
      message: "Note created successfully",
      note,
    });
  } catch (error) {
    console.error("Error in createNote controller:", error);
    return res.status(500).json({
      message: "Failed to create note",
      error: error.message,
    });
  }
};

export const deleteNote = async (req, res) => {
  const { _id } = req.params;
  const { user } = req;

  if (!_id) {
    return res.status(400).json({ message: "Note ID not provided" });
  }

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({ message: "Invalid note ID format" });
  }

  try {
    // 1️⃣ Delete note
    const note = await Note.findOneAndDelete({
      _id,
      userId: user._id,
    });

    if (!note) {
      return res.status(404).json({
        message: "Note not found or you don't have permission to delete it",
      });
    }

    // 2️⃣ Remove noteId from all index docs
    await SearchIndex.updateMany(
      { noteIds: note._id },
      { $pull: { noteIds: note._id } },
    );

    // 3️⃣ Cleanup empty index docs
    await SearchIndex.deleteMany({
      noteIds: { $size: 0 },
    });

    return res.status(200).json({
      message: "Note deleted and search index cleaned",
      noteId: _id,
    });
  } catch (error) {
    console.error("Error in deleteNote controller:", error);
    return res.status(500).json({
      message: "Failed to delete note",
      error: error.message,
    });
  }
};

export const getNote = async (req, res) => {
  const { _id } = req.params;
  const { user } = req;

  if (!_id) {
    return res.status(400).json({
      message: "Note ID not provided",
    });
  }
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({
      message: "Invalid note ID format",
    });
  }

  try {
    const note = await Note.findOne({ _id, userId: user._id });

    if (!note) {
      return res.status(404).json({
        message: "Note not found or you don't have permission to access it",
      });
    }

    return res.status(200).json({
      message: "Note retrieved successfully",
      note,
    });
  } catch (error) {
    console.error("Error in getNote controller:", error);
    return res.status(500).json({
      message: "Failed to retrieve note",
      error: error.message,
    });
  }
};

// Public collection  + Public note  → Everyone
// Public collection  + Private note → Owner + Note collaborators
// Private collection + Public note  → Owner + Collection collaborators
// Private collection + Private note → Owner + (Note AND Collection

export const getNoteBySlug = async (req, res) => {
  const { username, collectionSlug, noteSlug } = req.params;
  const requester = req.user || null;

  try {
    const user = await User.findOne({
      userName: { $regex: new RegExp(`^${username}$`, "i") },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    const collection = await Collection.findOne({
      userId: user._id,
      slug: collectionSlug.toLowerCase(),
    });

    if (!collection)
      return res.status(404).json({ message: "Collection not found" });

    const note = await Note.findOne({
      collectionId: collection._id,
      slug: noteSlug.toLowerCase(),
    });

    if (!note) return res.status(404).json({ message: "Note not found" });

    const accessAllowed = canAccessNote({
      requester,
      ownerId: user._id,
      note,
      collection,
    });

    if (!accessAllowed) {
      return res
        .status(403)
        .json({ message: "You don't have access to this note" });
    }

    return res.status(200).json({
      message: "Note fetched successfully",
      note,
      author: user,
    });
  } catch (error) {
    console.error("Error fetching note by slug:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export const getPublicNotes = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const requester = req.user || null;
  const requesterId = requester?._id;

  try {
    // Get all collections the user has access to
    const accessibleCollections = await Collection.find({
      $or: [
        { visibility: "public" },
        {
          visibility: "private",
          $or: [{ userId: requesterId }, { collaborators: requesterId }],
        },
      ],
    })
      .select("_id visibility collaborators userId")
      .lean();

    // Get notes from these collections
    const notes = await Note.find({
      collectionId: { $in: accessibleCollections.map((c) => c._id) },
    })
      .populate("userId", "_id userName fullName avatar")
      .populate("collectionId", "_id name slug visibility collaborators userId")
      .sort({ updatedAt: -1 })
      .lean();

    // Filter notes based on access rules
    const accessibleNotes = notes.filter((note) => {
      const collection = accessibleCollections.find(
        (c) => c._id.toString() === note.collectionId._id.toString(),
      );
      return canAccessNote({
        requester,
        ownerId: note.userId._id,
        note,
        collection: collection || note.collectionId,
      });
    });

    // Apply pagination
    const paginatedNotes = accessibleNotes.slice(skip, skip + limit);
    const totalNotes = accessibleNotes.length;
    const totalPages = Math.ceil(totalNotes / limit);

    return res.status(200).json({
      success: true,
      data: {
        notes: paginatedNotes,
        pagination: {
          currentPage: page,
          totalPages,
          totalNotes,
          notesPerPage: limit,
          hasMore: page < totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Error in getPublicNotes controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve notes",
      error: error.message,
    });
  }
};

export const updateContent = async (req, res) => {
  const { content, noteId } = req.body;
  const { user } = req;

  if (!noteId || content === undefined) {
    return res.status(400).json({
      message: "Note ID and content are required",
    });
  }

  try {
    // 1️⃣ Find the note first
    const note = await Note.findOne({ _id: noteId, userId: user._id });
    if (!note) {
      return res.status(404).json({
        message: "Note not found or you don't have permission to update it",
      });
    }

    // 2️⃣ Extract old keywords from current content
    const oldKeywords = extractKeywords(`${note.name} ${note.content || ""}`);

    // 3️⃣ Update content
    note.content = content;
    await note.save();

    // 4️⃣ Extract new keywords from updated content
    const newKeywords = extractKeywords(`${note.name} ${content}`);

    // 5️⃣ Update search index
    await updateIndex(note._id, oldKeywords, newKeywords);

    return res.status(200).json({
      message: "Note content updated and reindexed successfully",
      note,
    });
  } catch (error) {
    console.error("Error in updateContent controller:", error);
    return res.status(500).json({
      message: "Failed to update note content",
      error: error.message,
    });
  }
};

export const renameNote = async (req, res) => {
  const { noteId, newName } = req.body;
  const { user } = req;

  if (!noteId || !newName) {
    return res.status(400).json({
      message: "Note ID and new name are required",
    });
  }

  try {
    // 1️⃣ Fetch note first
    const note = await Note.findOne({ _id: noteId, userId: user._id });
    if (!note) {
      return res.status(404).json({
        message: "Note not found or you don't have permission to rename it",
      });
    }

    // 2️⃣ Extract old keywords (title + content)
    const oldKeywords = extractKeywords(
      `${note.name} ${note.content || ""}`
    );

    // 3️⃣ Rename
    note.name = newName;
    await note.save();

    // 4️⃣ Extract new keywords (updated title + content)
    const newKeywords = extractKeywords(
      `${newName} ${note.content || ""}`
    );

    // 5️⃣ Update search index
    await updateIndex(note._id, oldKeywords, newKeywords);

    return res.status(200).json({
      message: "Note renamed and reindexed successfully",
      note,
    });
  } catch (error) {
    console.error("Error in renameNote controller:", error);
    return res.status(500).json({
      message: "Failed to rename note",
      error: error.message,
    });
  }
};

export const moveTo = async (req, res) => {
  const { noteId, collectionId } = req.body;
  const { user } = req;

  if (!noteId || !collectionId) {
    return res.status(400).json({
      message: "Note ID and collection ID are required",
    });
  }

  try {
    // 1️⃣ Move the note
    const note = await Note.findOneAndUpdate(
      { _id: noteId, userId: user._id },
      { collectionId },
      { new: true },
    );

    if (!note) {
      return res.status(404).json({
        message: "Note not found or you don't have permission to move it",
      });
    }

    // 2️⃣ Fetch ONLY required collection fields
    const collection = await Collection.findById(collectionId);

    return res.status(200).json({
      message: "Note moved to new collection successfully",
      collection,
      note,
    });
  } catch (error) {
    console.error("Error in moveTo note controller:", error);
    return res.status(500).json({
      message: "Failed to move note",
      error: error.message,
    });
  }
};

export const updateVisibility = async (req, res) => {
  const { noteId, visibility } = req.body;
  const { user } = req;

  if (!user) return res.status(401).json({ message: "You are unauthorized" });
  if (!visibility || !noteId) {
    return res.status(400).json({
      message: "all fields required [`visibility`, `noteId`]",
    });
  }

  try {
    const note = await Note.findOneAndUpdate(
      { _id: noteId, userId: user._id },
      { visibility },
      { new: true },
    );
    if (!note) {
      return res.status(404).json({
        message: "note not found or you don't have permission to update it",
      });
    }
    return res.status(200).json({
      message: `visiblity updated to ${note.visibility}`,
      note,
    });
  } catch (error) {
    console.error("Error in updateVisibility controller:", error);
    return res.status(500).json({
      message: "Failed to update visibility",
      error: error.message,
    });
  }
};

export const updateCollaborators = async (req, res) => {
  let { collaborators, noteId } = req.body;
  const { user } = req;

  if (!user) return res.status(401).json({ message: "You are unauthorized" });
  if (!Array.isArray(collaborators) || !noteId) {
    return res.status(400).json({
      message: "all fields required [`collaborators: Array`, `noteId`]",
    });
  }
  collaborators = [...new Set(collaborators)];

  try {
    // Update the note's collaborators
    const updatedNote = await Note.findOneAndUpdate(
      { _id: noteId, userId: user._id },
      { collaborators },
      { new: true },
    ).populate("collaborators", "fullName userName email avatar _id");

    if (!updatedNote) {
      return res.status(404).json({
        message: "note not found or you don't have permission to update it",
      });
    }

    return res.status(200).json({
      message: "Collaborators updated and populated successfully",
      note: updatedNote,
    });
  } catch (error) {
    console.error("Error in updateCollaborators controller:", error);
    return res.status(500).json({
      message: "Failed to update collaborators",
      error: error.message,
    });
  }
};

export const searchNotes = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ message: "Query required" });
    }

    const requester = req.user || null;
    const requesterId = requester?._id;

    const tokens = normalizeText(q);
    if (!tokens.length) return res.json([]);

    const scoreMap = new Map(); // noteId -> score

    /* 1️⃣ Index-based search */
    const indexDocs = await SearchIndex.find({
      lemma: { $in: tokens },
    });

    for (const doc of indexDocs) {
      for (const id of doc.noteIds) {
        const key = id.toString();
        scoreMap.set(key, (scoreMap.get(key) || 0) + 1);
      }
    }

    /* 2️⃣ Title substring search (>=2 chars, higher weight) */
    const titleTokens = tokens.filter((t) => t.length >= 2);

    if (titleTokens.length) {
      const titleRegex = titleTokens.map((t) => `(?=.*${t})`).join("");
      const titleNotes = await Note.find({
        name: { $regex: titleRegex, $options: "i" },
      }).select("_id");

      for (const note of titleNotes) {
        const key = note._id.toString();
        scoreMap.set(key, (scoreMap.get(key) || 0) + 3); // ⭐ higher weight
      }
    }

    /* 3️⃣ Sort by score */
    const sortedNoteIds = [...scoreMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);

    /* 4️⃣ Fetch notes + populate */
    const notes = await Note.find({
      _id: { $in: sortedNoteIds },
    })
      .populate("userId", "_id userName fullName avatar")
      .populate(
        "collectionId",
        "_id name slug visibility collaborators userId"
      )
      .lean();

    // Filter notes using the same access rules
    const accessibleNotes = notes.filter((note) =>
      canAccessNote({
        requester,
        ownerId: note.userId._id,
        note,
        collection: note.collectionId, // populated collection
      })
    );

    // Preserve ranking
    const noteMap = new Map(accessibleNotes.map(n => [n._id.toString(), n]));
    const rankedNotes = sortedNoteIds
      .map(id => noteMap.get(id))
      .filter(Boolean);

    res.json(rankedNotes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Search failed" });
  }
};

