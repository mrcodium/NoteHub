import mongoose from "mongoose";
import Note from "../model/note.model.js";
import Collection from "../model/collection.model.js";
import SearchIndex from "../model/searchIndex.model.js";
import User from "../model/user.model.js";
import { canAccessNote } from "../utils/permissions.js";
import {
  extractKeywordFrequency,
  normalizeText,
} from "../services/indexer/textProcessor.js";
import { updateIndex } from "../services/indexer/updateIndex.js";
import { delCache, getCache, setCache } from "../services/cache.service.js";

export const getNoteById = async (req, res) => {
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

  const cacheKey = `note:id:${_id}:user:${user?._id || "guest"}`;
  try {
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json({
        ...JSON.parse(cached),
        cache: true, // optional flag
      });
    }

    const note = await Note.findById(_id);

    if (!note) {
      return res.status(404).json({
        message: "Note not found or you don't have permission to access it",
      });
    }

    // 3️⃣ Permission check: author or admin
    const isAuthor = note.userId._id.equals(user._id);
    const isAdmin = user.role === "admin";

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        message: "You don't have permission to access this note",
      });
    }

    const responseData = {
      message: "Note retrieved successfully",
      note,
    };

    await setCache(cacheKey, responseData, 600); // TTL 10 min
    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error in getNote controller:", error);
    return res.status(500).json({
      message: "Failed to retrieve note",
      error: error.message,
    });
  }
};

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

    // 2️⃣ Extract keyword frequency (title + content)
    const freqMap = extractKeywordFrequency(`${name} ${content}`);

    // 3️⃣ Build index operations
    const ops = Object.entries(freqMap).map(([lemma, tf]) => ({
      updateOne: {
        filter: { lemma },
        update: {
          $push: {
            notes: {
              noteId: note._id,
              tf,
            },
          },
        },
        upsert: true,
      },
    }));

    if (ops.length) {
      await SearchIndex.bulkWrite(ops);
    }

    return res.status(201).json({
      message: "Note created & indexed successfully",
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
      { "notes.noteId": note._id },
      { $pull: { notes: { noteId: note._id } } },
    );

    // 3️⃣ Cleanup empty index docs
    await SearchIndex.deleteMany({
      notes: { $size: 0 },
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

export const updateContent = async (req, res) => {
  const { content, noteId } = req.body;
  const { user } = req;

  if (!noteId || content === undefined) {
    return res.status(400).json({
      message: "Note ID and content are required",
    });
  }

  try {
    const note = await Note.findById(noteId)
      .populate("collectionId", "slug")
      .populate("userId", "userName");

    const isAuthor = note.userId._id.equals(user._id);
    const isAdmin = user.role === "admin";

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        message: "You are not allowed to update this note",
      });
    }

    // after updating content
    note.content = content;
    note.contentUpdatedAt = new Date();
    await note.save();

    // 1️⃣ Reindex
    await updateIndex(note._id, `${note.name} ${content}`);

    // 2️⃣ Invalidate ID cache
    await delCache(`note:id:${note._id}:user:${user._id}`);
    await delCache(`note:id:${note._id}:user:guest`);

    // 3️⃣ Invalidate SLUG cache
    const username = note.userId.userName;
    const collectionSlug = note.collectionId.slug;
    const noteSlug = note.slug;

    await delCache(
      `note:slug:${username}:${collectionSlug}:${noteSlug}:user:${user._id}`,
    );
    await delCache(
      `note:slug:${username}:${collectionSlug}:${noteSlug}:user:guest`,
    );

    return res.status(200).json({
      message: "Note content updated & reindexed successfully",
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
    // 1️⃣ Fetch note WITH required context
    const note = await Note.findOne({
      _id: noteId,
      userId: user._id,
    })
      .populate("collectionId", "slug")
      .populate("userId", "userName");

    if (!note) {
      return res.status(404).json({
        message: "Note not found or you don't have permission to rename it",
      });
    }

    // 🔑 store old slug BEFORE rename
    const oldSlug = note.slug;
    const username = note.userId.userName;
    const collectionSlug = note.collectionId.slug;

    // 2️⃣ Rename
    note.name = newName;
    await note.save(); // slug regenerates here

    // 3️⃣ Reindex
    await updateIndex(note._id, newName);

    // 4️⃣ cache invalidation
    await delCache(`note:id:${note._id}:user:${user._id}`);
    await delCache(`note:id:${note._id}:user:guest`);

    await delCache(
      `note:slug:${username}:${collectionSlug}:${oldSlug}:user:${user._id}`,
    );
    await delCache(
      `note:slug:${username}:${collectionSlug}:${oldSlug}:user:guest`,
    );

    return res.status(200).json({
      message: "Note renamed & reindexed successfully",
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

// Public collection  + Public note  → Everyone
// Public collection  + Private note → Owner + Note collaborators
// Private collection + Public note  → Owner + Collection collaborators
// Private collection + Private note → Owner + (Note AND Collection

export const getNoteBySlug = async (req, res) => {
  const { username, collectionSlug, noteSlug } = req.params;
  const requester = req.user || null;

  const cacheKey = `note:slug:${username}:${collectionSlug}:${noteSlug}:user:${requester?._id || "guest"}`;

  try {
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json({
        ...JSON.parse(cached),
        cache: true,
      });
    }

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

    const responseData = {
      message: "Note fetched successfully",
      note,
      author: user,
    };
    await setCache(cacheKey, responseData, 600); // TTL 600s = 10 min
    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching note by slug:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export const getPublicNotes = async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit) || 10, 1);
  const skip = (page - 1) * limit;
  const requester = req.user || null;
  const requesterId = requester?._id;
  const cacheKey = `public:notes:page:${page}:limit:${limit}:user:${requesterId || "guest"}`;

  try {
    // ✅ Check cache
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        data: JSON.parse(cached),
        cache: true,
      });
    }

    // ✅ Build collection query
    const collectionQuery = {
      $or: [
        { visibility: "public" },
        ...(requesterId
          ? [{ visibility: "private", userId: requesterId }]
          : []),
      ],
    };

    const accessibleCollections = await Collection.find(collectionQuery)
      .select("_id visibility userId")
      .lean();

    if (!accessibleCollections.length) {
      const emptyResponse = {
        notes: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalNotes: 0,
          notesPerPage: limit,
          hasMore: false,
        },
      };
      await setCache(cacheKey, emptyResponse, 60);
      return res.status(200).json({ success: true, data: emptyResponse });
    }

    const collectionIds = accessibleCollections.map((c) => c._id.toString());
    const collectionMap = new Map(
      accessibleCollections.map((c) => [c._id.toString(), c]),
    );

    // ✅ Fetch notes with buffer
    const bufferMultiplier = 3;
    const fetchLimit = limit * bufferMultiplier;

    const notes = await Note.find({ collectionId: { $in: collectionIds } })
      .populate("userId", "_id userName fullName avatar role")
      .populate("collectionId", "_id name slug visibility userId")
      .sort({ contentUpdatedAt: -1 })
      .skip(0) // fetch from start, slice later
      .limit(skip + fetchLimit)
      .lean();

    // ✅ Filter accessible notes
    const accessibleNotes = notes.filter((note) => {
      const collection = collectionMap.get(note.collectionId._id.toString());
      return (
        collection &&
        canAccessNote({
          requester,
          ownerId: note.userId._id,
          note,
          collection,
        })
      );
    });

    // ✅ Paginate
    const paginatedNotes = accessibleNotes.slice(skip, skip + limit);

    // ✅ Count total notes efficiently
    let totalNotes = accessibleNotes.length;
    if (
      notes.length >= skip + fetchLimit &&
      accessibleNotes.length >= skip + limit
    ) {
      totalNotes = await Note.countDocuments({
        collectionId: { $in: collectionIds },
      });
    }

    const totalPages = Math.ceil(totalNotes / limit);

    const responseData = {
      notes: paginatedNotes,
      pagination: {
        currentPage: page,
        totalPages,
        totalNotes,
        notesPerPage: limit,
        hasMore: page < totalPages,
      },
    };

    await setCache(cacheKey, responseData, 120);

    return res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    console.error("Error in getPublicNotes controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve notes",
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
    const note = await Note.findOne({
      _id: noteId,
      userId: user._id,
    })
      .populate("collectionId", "slug")
      .populate("userId", "userName");

    if (!note) {
      return res.status(404).json({
        message: "Note not found or you don't have permission to move it",
      });
    }

    const oldCollectionSlug = note.collectionId.slug;
    const oldNoteSlug = note.slug;
    const username = note.userId.userName;

    // move
    note.collectionId = collectionId;
    await note.save(); // slug may regenerate

    // ❌ invalidate OLD cache
    await delCache(`note:id:${note._id}:user:${user._id}`);
    await delCache(`note:id:${note._id}:user:guest`);

    await delCache(
      `note:slug:${username}:${oldCollectionSlug}:${oldNoteSlug}:user:${user._id}`,
    );
    await delCache(
      `note:slug:${username}:${oldCollectionSlug}:${oldNoteSlug}:user:guest`,
    );

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
    )
      .populate("collectionId", "slug")
      .populate("userId", "userName");

    if (!note) {
      return res.status(404).json({
        message: "note not found or you don't have permission to update it",
      });
    }

    // invalidate
    await delCache(`note:id:${note._id}:user:${user._id}`);
    await delCache(`note:id:${note._id}:user:guest`);

    await delCache(
      `note:slug:${note.userId.userName}:${note.collectionId.slug}:${note.slug}:user:${user._id}`,
    );
    await delCache(
      `note:slug:${note.userId.userName}:${note.collectionId.slug}:${note.slug}:user:guest`,
    );

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
    const updatedNote = await Note.findOneAndUpdate(
      { _id: noteId, userId: user._id },
      { collaborators },
      { new: true },
    )
      .populate("collectionId", "slug")
      .populate("userId", "userName")
      .populate("collaborators", "fullName userName email avatar _id");

    if (!updatedNote) {
      return res.status(404).json({
        message: "note not found or you don't have permission to update it",
      });
    }

    // invalidate
    await delCache(`note:id:${updatedNote._id}:user:${user._id}`);
    await delCache(`note:id:${updatedNote._id}:user:guest`);

    await delCache(
      `note:slug:${updatedNote.userId.userName}:${updatedNote.collectionId.slug}:${updatedNote.slug}:user:${user._id}`,
    );
    await delCache(
      `note:slug:${updatedNote.userId.userName}:${updatedNote.collectionId.slug}:${updatedNote.slug}:user:guest`,
    );

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

// controllers/search.controller.js
export const searchNotes = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    if (!q) return res.status(400).json({ message: "Query required" });

    const requester = req.user || null;
    const userKey = requester?._id?.toString() || "guest";

    const tokens = normalizeText(q);
    if (!tokens.length) {
      return res.json({
        notes: [],
        pagination: { currentPage: 1, totalPages: 0, totalItems: 0 },
      });
    }

    const normalizedQueryKey = [...new Set(tokens)].sort().join("_");
    const cacheKey = `search:${userKey}:q:${normalizedQueryKey}:p:${page}:l:${limit}`;

    // 1️⃣ Check cache first
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json({
        ...JSON.parse(cached),
        cache: true,
      });
    }

    const currentPage = Number(page);
    const notesPerPage = Number(limit);
    const skip = (currentPage - 1) * notesPerPage;

    const queryTokenSet = new Set(tokens);
    const uniqueTokens = [...queryTokenSet];

    // 🔹 Parallel fetch with optimized queries
    const [indexDocs, titleNotes, TOTAL_NOTES] = await Promise.all([
      SearchIndex.find({ lemma: { $in: uniqueTokens } })
        .select("lemma notes")
        .lean(),
      Note.find({
        name: new RegExp(uniqueTokens.join("|"), "i"),
      })
        .select("_id name")
        .lean(),
      Note.countDocuments(),
    ]);

    // 🎯 Enhanced scoring with multiple signals
    const scoreMap = new Map();
    const noteMetrics = new Map(); // Track individual scoring components

    // === SIGNAL 1: Content TF-IDF (weighted: 2x) ===
    for (const doc of indexDocs) {
      const df = doc.notes.length;
      const idf = Math.log((TOTAL_NOTES + 1) / (df + 1));

      for (const { noteId, tf } of doc.notes) {
        const key = noteId.toString();
        const tfidf = tf * idf;
        const contentScore = tfidf * 2;

        scoreMap.set(key, (scoreMap.get(key) || 0) + contentScore);

        // Track metrics
        if (!noteMetrics.has(key)) {
          noteMetrics.set(key, { content: 0, title: 0, exact: 0, coverage: 0 });
        }
        noteMetrics.get(key).content += contentScore;
      }
    }

    // === SIGNAL 2: Title Matching (weighted: 6x per term) ===
    for (const note of titleNotes) {
      const key = note._id.toString();
      const titleTokens = normalizeText(note.name);
      const titleLower = note.name.toLowerCase();

      let titleScore = 0;
      const matched = new Set();

      // Term frequency in title
      for (const token of tokens) {
        const tf = titleTokens.filter((t) => t === token).length;
        if (tf > 0) {
          matched.add(token);
          titleScore += tf * 6;
        }
      }

      // === SIGNAL 3: Full query coverage bonus (+8) ===
      if (matched.size === queryTokenSet.size) {
        titleScore += 8;
        if (!noteMetrics.has(key)) {
          noteMetrics.set(key, { content: 0, title: 0, exact: 0, coverage: 0 });
        }
        noteMetrics.get(key).coverage = 8;
      }

      // === SIGNAL 4: Exact phrase match (+10, stronger) ===
      const phraseRegex = new RegExp(tokens.join("\\s+"), "i");
      if (phraseRegex.test(note.name)) {
        titleScore += 10;
        if (!noteMetrics.has(key)) {
          noteMetrics.set(key, { content: 0, title: 0, exact: 0, coverage: 0 });
        }
        noteMetrics.get(key).exact = 10;
      }

      // === SIGNAL 5: Title starts with query (high relevance) (+5) ===
      if (titleLower.startsWith(q.toLowerCase())) {
        titleScore += 5;
      }

      // === SIGNAL 6: Query token order preserved (+3) ===
      let lastIndex = -1;
      let orderPreserved = true;
      for (const token of tokens) {
        const idx = titleTokens.indexOf(token, lastIndex + 1);
        if (idx === -1 || idx <= lastIndex) {
          orderPreserved = false;
          break;
        }
        lastIndex = idx;
      }
      if (orderPreserved && tokens.length > 1) {
        titleScore += 3;
      }

      if (titleScore > 0) {
        scoreMap.set(key, (scoreMap.get(key) || 0) + titleScore);
        if (!noteMetrics.has(key)) {
          noteMetrics.set(key, { content: 0, title: 0, exact: 0, coverage: 0 });
        }
        noteMetrics.get(key).title += titleScore;
      }
    }

    // Sort by total score (descending)
    const sortedNoteIds = [...scoreMap.entries()]
      .sort((a, b) => {
        const scoreDiff = b[1] - a[1];
        // Tie-breaker: prefer notes with title matches
        if (Math.abs(scoreDiff) < 0.01) {
          const aMetrics = noteMetrics.get(a[0]) || {};
          const bMetrics = noteMetrics.get(b[0]) || {};
          return (bMetrics.title || 0) - (aMetrics.title || 0);
        }
        return scoreDiff;
      })
      .map(([id]) => id);

    if (!sortedNoteIds.length) {
      const emptyResult = {
        notes: [],
        pagination: { currentPage, totalPages: 0, totalItems: 0 },
      };
      await setCache(cacheKey, emptyResult, 300); // Cache empty results longer
      return res.json(emptyResult);
    }

    const totalNotes = sortedNoteIds.length;
    const totalPages = Math.ceil(totalNotes / notesPerPage);
    const pagedNoteIds = sortedNoteIds.slice(skip, skip + notesPerPage);

    // Fetch full note details (only for current page)
    const notes = await Note.find({ _id: { $in: pagedNoteIds } })
      .populate("userId", "_id userName fullName avatar")
      .populate("collectionId", "_id name slug visibility collaborators userId")
      .lean();

    // Permission filtering
    const accessibleNotes = notes.filter((note) =>
      canAccessNote({
        requester,
        ownerId: note.userId._id,
        note,
        collection: note.collectionId,
      }),
    );

    // Preserve ranking order
    const noteMap = new Map(accessibleNotes.map((n) => [n._id.toString(), n]));
    const rankedNotes = pagedNoteIds
      .map((id) => noteMap.get(id))
      .filter(Boolean);

    const responseData = {
      notes: rankedNotes,
      pagination: {
        currentPage,
        totalPages,
        totalItems: totalNotes,
        itemsPerPage: notesPerPage,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },
      meta: {
        query: q,
        tokensMatched: uniqueTokens.length,
      },
    };

    // 2️⃣ Smart cache TTL based on result size
    const cacheTTL = totalNotes === 0 ? 300 : totalNotes < 10 ? 120 : 60;
    await setCache(cacheKey, responseData, cacheTTL);

    res.status(200).json(responseData);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ message: "Search failed" });
  }
};
