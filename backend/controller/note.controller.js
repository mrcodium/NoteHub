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
import { 
  getCache, 
  setCache, 
  cacheKeys, 
  invalidateNoteCache, 
  invalidateCollectionCache, 
  invalidateFeedsAndSearch,
  fetchWithCache
} from "../services/cache.service.js";
import { handleDbError } from "../utils/dbError.js";

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

  const cacheKey = cacheKeys.note.byId(_id, user?._id || "guest");
  try {
    const { data } = await fetchWithCache(cacheKey, async () => {
      const note = await Note.findById(_id);

      if (!note) {
        throw { status: 404, message: "Note not found or you don't have permission to access it" };
      }

      // 3️⃣ Permission check: author or admin
      const isAuthor = note.userId._id.equals(user._id);
      const isAdmin = user.role === "admin";

      if (!isAuthor && !isAdmin) {
        throw { status: 403, message: "You don't have permission to access this note" };
      }

      return {
        message: "Note retrieved successfully",
        note,
      };
    }, 600); // 10 mins

    return res.status(200).json(data);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error("Error in getNote controller:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
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

    // 4️⃣ Invalidate caches
    const username = user.userName;
    const collection = await Collection.findById(collectionId);
    if (collection) {
      await invalidateCollectionCache(username, collection.slug);
    }
    await invalidateFeedsAndSearch();

    return res.status(201).json({
      message: "Note created & indexed successfully",
      note,
    });
  } catch (error) {
    console.error("Error in createNote controller:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
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
    const isAdmin = user.role === "admin";
    const query = isAdmin ? { _id } : { _id, userId: user._id };
    const note = await Note.findOneAndDelete(query);

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

    // 4️⃣ Invalidate caches
    await invalidateNoteCache(note._id, user.userName, null, null);
    const collection = await Collection.findById(note.collectionId);
    if (collection) {
      await invalidateNoteCache(null, user.userName, collection.slug, note.slug);
      await invalidateCollectionCache(user.userName, collection.slug);
    }
    await invalidateFeedsAndSearch();

    return res.status(200).json({
      message: "Note deleted and search index cleaned",
      noteId: _id,
    });
  } catch (error) {
    console.error("Error in deleteNote controller:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
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
    // ✅ Fetch WITHOUT populate first — keep refs as ObjectIds for save
    const note = await Note.findById(noteId);

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    const isAuthor = note.userId.equals(user._id);
    const isAdmin = user.role === "admin";

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        message: "You are not allowed to update this note",
      });
    }

    note.content = content;
    note.contentUpdatedAt = new Date();
    await note.save(); // ✅ pre("save") hook runs cleanly, no populated refs to confuse Mongoose

    // ✅ NOW populate for cache key building & response
    await note.populate("collectionId", "slug");
    await note.populate("userId", "userName");

    // Reindex
    await updateIndex(note._id, `${note.name} ${content}`);

    // Invalidate caches
    const username = note.userId.userName;
    const collectionSlug = note.collectionId.slug;
    const noteSlug = note.slug;

    await invalidateNoteCache(note._id, username, collectionSlug, noteSlug);
    await invalidateFeedsAndSearch();

    return res.status(200).json({
      message: "Note content updated & reindexed successfully",
      note,
    });
  } catch (error) {
    console.error("Error in updateContent controller:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
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
    const isAdmin = user.role === "admin";
    const query = isAdmin ? { _id: noteId } : { _id: noteId, userId: user._id };
    const note = await Note.findOne(query)
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
    await invalidateNoteCache(note._id, username, collectionSlug, oldSlug);
    await invalidateNoteCache(null, username, collectionSlug, note.slug); // invalidate new slug too
    await invalidateCollectionCache(username, collectionSlug);
    await invalidateFeedsAndSearch();

    return res.status(200).json({
      message: "Note renamed & reindexed successfully",
      note,
    });
  } catch (error) {
    console.error("Error in renameNote controller:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

// Public collection  + Public note  → Everyone
// Public collection  + Private note → Owner + Note collaborators
// Private collection + Public note  → Owner + Collection collaborators
// Private collection + Private note → Owner + (Note AND Collection)

export const getNoteBySlug = async (req, res) => {
  const { username, collectionSlug, noteSlug } = req.params;
  const requester = req.user || null;

  const normalizedUsername = username.trim().toLowerCase();
  const requesterId = requester?._id || null;

  const cacheKey = cacheKeys.note.bySlug(normalizedUsername, collectionSlug, noteSlug, requesterId || "guest");

  try {
    const { data } = await fetchWithCache(cacheKey, async () => {
      const result = await User.aggregate([
        // 1️⃣ Match user
        {
          $match: { userName: normalizedUsername },
        },

        // 2️⃣ Join collections
        {
          $lookup: {
            from: "collections",
            let: { userId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$userId", "$$userId"] },
                      { $eq: ["$slug", collectionSlug.toLowerCase()] },
                    ],
                  },
                },
              },

              // 3️⃣ Join notes
              {
                $lookup: {
                  from: "notes",
                  let: { collectionId: "$_id" },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            { $eq: ["$collectionId", "$$collectionId"] },
                            { $eq: ["$slug", noteSlug.toLowerCase()] },
                          ],
                        },
                      },
                    },
                    // 4️⃣ Join note collaborators info
                    {
                      $lookup: {
                        from: "users",
                        localField: "collaborators",
                        foreignField: "_id",
                        as: "collaborators",
                      },
                    },
                    {
                      $project: {
                        _id: 1,
                        name: 1,
                        content: 1,
                        tableOfContent: 1,
                        visibility: 1,
                        slug: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        contentUpdatedAt: 1,
                        collaborators: {
                          _id: 1,
                          userName: 1,
                          fullName: 1,
                          avatar: 1,
                        },
                      },
                    },
                  ],
                  as: "note",
                },
              },

              { $unwind: "$note" },
            ],
            as: "collection",
          },
        },

        { $unwind: "$collection" },

        // 4️⃣ Project only what we need
        {
          $project: {
            author: {
              _id: "$_id",
              userName: "$userName",
              avatar: "$avatar",
              fullName: "$fullName",
            },
            collection: {
              _id: "$collection._id",
              visibility: "$collection.visibility",
              collaborators: "$collection.collaborators",
            },
            note: {
              _id: "$collection.note._id",
              name: "$collection.note.name",
              content: "$collection.note.content",
              tableOfContent: "$collection.note.tableOfContent",
              visibility: "$collection.note.visibility",
              slug: "$collection.note.slug",

              // ✅ DATES
              createdAt: "$collection.note.createdAt",
              updatedAt: "$collection.note.updatedAt",
              contentUpdatedAt: "$collection.note.contentUpdatedAt",
              collaborators: "$collection.note.collaborators",
            },
          },
        },
      ]);

      if (!result.length) {
        throw { status: 404, message: "Note not found" };
      }

      const { author, collection, note } = result[0];

      const accessAllowed = canAccessNote({
        requester,
        ownerId: author._id,
        note,
        collection,
      });

      if (!accessAllowed) {
        throw { status: 403, message: "You don't have access to this note" };
      }

      return {
        message: "Note fetched successfully",
        note,
        author,
      };
    }, 600);

    return res.status(200).json(data);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error("Aggregation error:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

export const getPublicNotes = async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100); // Cap at 100
  const skip = (page - 1) * limit;

  const requester = req.user || null;
  const requesterId = requester?._id;
  const cacheKey = cacheKeys.feed.public(page, limit, requesterId || "guest");

  try {
    const { data } = await fetchWithCache(cacheKey, async () => {
      /* ===============================
         1️⃣ BUILD OPTIMIZED NOTE QUERY
         - Single DB query instead of multiple passes
         - Leverage MongoDB indexes
      =============================== */
      const noteQueryConditions = [];

      // RULE 1: Public collection + Public note → Everyone
      noteQueryConditions.push({
        "collectionId.visibility": "public",
        visibility: "public",
      });

      // Authenticated user conditions
      if (requesterId) {
        // RULE 2: Owner sees everything in their collections
        noteQueryConditions.push({
          "collectionId.userId": requesterId,
        });

        // RULE 3: Public collection + Private note → Note collaborators
        noteQueryConditions.push({
          "collectionId.visibility": "public",
          visibility: "private",
          collaborators: requesterId,
        });

        // RULE 4: Private collection + Public note → Collection collaborators
        noteQueryConditions.push({
          "collectionId.visibility": "private",
          visibility: "public",
          "collectionId.collaborators": requesterId,
        });

        // RULE 5: Private collection + Private note → Note AND Collection collaborators
        noteQueryConditions.push({
          "collectionId.visibility": "private",
          visibility: "private",
          collaborators: requesterId,
          "collectionId.collaborators": requesterId,
        });
      }

      /* ===============================
         2️⃣ AGGREGATION PIPELINE (SINGLE QUERY)
         - Join collections with notes
         - Apply all filters at DB level
         - More efficient than separate queries + filtering
      =============================== */
      const pipeline = [
        // Join with collections
        {
          $lookup: {
            from: "collections",
            localField: "collectionId",
            foreignField: "_id",
            as: "collectionId",
          },
        },
        {
          $unwind: "$collectionId",
        },

        // Apply access rules at DB level
        {
          $match: {
            $or: noteQueryConditions,
          },
        },

        // Add facet for count + data in single query
        {
          $facet: {
            metadata: [{ $count: "total" }],
            data: [
              { $sort: { contentUpdatedAt: -1 } },
              { $skip: skip },
              { $limit: limit },
              // Join with user
              {
                $lookup: {
                  from: "users",
                  localField: "userId",
                  foreignField: "_id",
                  as: "userId",
                },
              },
              { $unwind: "$userId" },
              // Project only needed fields
              {
                $project: {
                  _id: 1,
                  name: 1,
                  slug: 1,
                  content: 1,
                  tableOfContent: 1,
                  visibility: 1,
                  contentUpdatedAt: 1,
                  createdAt: 1,
                  collaborators: 1,
                  "userId.role": 1,
                  "userId._id": 1,
                  "userId.userName": 1,
                  "userId.fullName": 1,
                  "userId.avatar": 1,
                  "collectionId._id": 1,
                  "collectionId.name": 1,
                  "collectionId.slug": 1,
                  "collectionId.visibility": 1,
                  "collectionId.userId": 1,
                  "collectionId.collaborators": 1,
                },
              },
            ],
          },
        },
      ];

      const result = await Note.aggregate(pipeline);

      const totalNotes = result[0]?.metadata[0]?.total || 0;
      const notes = result[0]?.data || [];
      const totalPages = Math.ceil(totalNotes / limit);

      /* ===============================
         3️⃣ RESPONSE
      =============================== */
      return {
        notes,
        pagination: {
          currentPage: page,
          totalPages,
          totalNotes,
          notesPerPage: limit,
          hasMore: page < totalPages,
        },
      };
    }, 120);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error in getPublicNotes:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
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
    const isAdmin = user.role === "admin";
    const query = isAdmin ? { _id: noteId } : { _id: noteId, userId: user._id };
    const note = await Note.findOne(query)
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
    await invalidateNoteCache(note._id, username, oldCollectionSlug, oldNoteSlug);
    await invalidateCollectionCache(username, oldCollectionSlug);

    // 2️⃣ Fetch ONLY required collection fields
    const collection = await Collection.findById(collectionId);

    // Invalidate new collection cache
    if (collection) {
      await invalidateNoteCache(null, username, collection.slug, note.slug);
      await invalidateCollectionCache(username, collection.slug);
    }
    
    await invalidateFeedsAndSearch();

    return res.status(200).json({
      message: "Note moved to new collection successfully",
      collection,
      note,
    });
  } catch (error) {
    console.error("Error in moveTo note controller:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
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
    const isAdmin = user.role === "admin";
    const query = isAdmin ? { _id: noteId } : { _id: noteId, userId: user._id };
    const note = await Note.findOneAndUpdate(
      query,
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
    await invalidateNoteCache(note._id, note.userId.userName, note.collectionId.slug, note.slug);
    await invalidateFeedsAndSearch();

    return res.status(200).json({
      message: `visiblity updated to ${note.visibility}`,
      note,
    });
  } catch (error) {
    console.error("Error in updateVisibility controller:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
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
    const isAdmin = user.role === "admin";
    const query = isAdmin ? { _id: noteId } : { _id: noteId, userId: user._id };
    const updatedNote = await Note.findOneAndUpdate(
      query,
      { collaborators },
      { new: true },
    )
      .populate("collectionId", "slug")
      .populate("userId", "userName")
      .populate("collaborators", "role fullName userName email avatar _id");

    if (!updatedNote) {
      return res.status(404).json({
        message: "note not found or you don't have permission to update it",
      });
    }

    // invalidate
    await invalidateNoteCache(updatedNote._id, updatedNote.userId.userName, updatedNote.collectionId.slug, updatedNote.slug);
    await invalidateCollectionCache(updatedNote.userId.userName, updatedNote.collectionId.slug); // just in case
    await invalidateFeedsAndSearch();

    return res.status(200).json({
      message: "Collaborators updated and populated successfully",
      note: updatedNote,
    });
  } catch (error) {
    console.error("Error in updateCollaborators controller:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

export const updateNote = async (req, res) => {
  const { _id } = req.params;
  const { name, slug, visibility, collaborators } = req.body;
  const { user } = req;

  if (!_id) {
    return res.status(400).json({ message: "Note ID is required" });
  }

  try {
    const note = await Note.findById(_id);
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    const isAuthor = note.userId.equals(user._id);
    const isAdmin = user.role === "admin";

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ message: "You are not allowed to update this note" });
    }

    // Capture context for cache invalidation
    await note.populate("userId", "userName");
    await note.populate("collectionId", "slug");
    const oldSlug = note.slug;
    const username = note.userId.userName;
    const collectionSlug = note.collectionId.slug;

    // Update fields
    if (name !== undefined) note.name = name;
    if (slug !== undefined) note.slug = slug;
    if (visibility !== undefined) note.visibility = visibility;
    if (collaborators !== undefined) note.collaborators = collaborators;

    await note.save();

    // Reindex if name changed
    if (name !== undefined) {
      await updateIndex(note._id, `${note.name} ${note.content}`);
    }

    // Invalidate caches
    await invalidateNoteCache(note._id, username, collectionSlug, oldSlug);
    if (oldSlug !== note.slug) {
      await invalidateNoteCache(null, username, collectionSlug, note.slug);
    }
    await invalidateCollectionCache(username, collectionSlug);
    await invalidateFeedsAndSearch();

    return res.status(200).json({
      message: "Note updated successfully",
      note,
    });
  } catch (error) {
    console.error("Error in updateNote controller:", error);
    // Generic error handler if handleDbError is missing or fails
    const status = error.name === "ValidationError" ? 400 : 500;
    const message = error.message || "An unexpected error occurred";
    return res.status(status).json({ success: false, message });
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
    const cacheKey = cacheKeys.search.query(userKey, normalizedQueryKey, page, limit);

    const { data } = await fetchWithCache(cacheKey, async () => {
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
        return {
          notes: [],
          pagination: { currentPage, totalPages: 0, totalItems: 0 },
        };
      }

      const totalNotes = sortedNoteIds.length;
      const totalPages = Math.ceil(totalNotes / notesPerPage);
      const pagedNoteIds = sortedNoteIds.slice(skip, skip + notesPerPage);

      // Fetch full note details (only for current page)
      const notes = await Note.find({ _id: { $in: pagedNoteIds } })
        .populate("userId", "_id userName role fullName avatar")
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

      return {
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
    }, 120);

    return res.status(200).json(data);
  } catch (error) {
    console.error("Search error:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

export const checkSlugAvailability = async (req, res) => {
  const { collectionId, slug, noteId } = req.query;

  if (!collectionId || !slug) {
    return res.status(400).json({ message: "Collection ID and slug are required" });
  }

  try {
    const query = {
      collectionId,
      slug: slug.toLowerCase(),
    };

    // If updating, exclude current note
    if (noteId) {
      query._id = { $ne: noteId };
    }

    const existingNote = await Note.findOne(query);

    return res.status(200).json({
      available: !existingNote,
    });
  } catch (error) {
    console.error("Error checking slug availability:", error);
    return res.status(500).json({ message: "Error checking slug availability" });
  }
};
