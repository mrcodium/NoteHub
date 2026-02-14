import mongoose from "mongoose";
import Collection from "../model/collection.model.js";
import Note from "../model/note.model.js";
import { getCache, setCache } from "../services/cache.service.js";
import User from "../model/user.model.js";

export const createCollection = async (req, res) => {
  const { name, visibility, collaborators } = req.body;
  const { user } = req;

  if (!user) {
    return res.status(401).json({ message: "Unauthorized: user not found." });
  }
  if (!name) {
    return res.status(400).json({ message: "Collection name is required." });
  }
  try {
    const existingCollection = await Collection.findOne({
      name,
      userId: user._id,
    });

    if (existingCollection) {
      return res.status(400).json({
        message: `The repository ${name} already exists on this account`,
      });
    }

    const collection = await Collection.create({
      name,
      userId: user._id,
      visibility,
      collaborators: collaborators || [],
    });

    res.status(201).json({
      message: "Collection created successfully",
      collection: { ...collection._doc, notes: [] },
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error." });
    console.error("Error in createCollection controller\n", error);
  }
};

export const deleteCollection = async (req, res) => {
  const { _id } = req.params;
  const { user } = req;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({ message: "Invalid _id provided" });
  }

  if (!user) {
    return res.status(401).json({ message: "Unauthorized: user not found." });
  }

  try {
    const collection = await Collection.findById(_id);
    if (!collection) {
      return res.status(404).json({ message: "Collection not found." });
    }

    if (collection.userId.toString() !== user._id.toString()) {
      return res.status(403).json({
        message:
          "Forbidden: you do not have permission to delete this collection.",
      });
    }

    // deleting associated notes as well.
    await Note.deleteMany({ collectionId: _id });
    await Collection.findByIdAndDelete(_id);
    res.status(200).json({ message: "Collection deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Internal server error." });
    console.error("Error in deleteCollection controller\n", error);
  }
};

export const renameCollection = async (req, res) => {
  const { _id, newName } = req.body;

  if (!_id || !newName) {
    return res.status(400).json({ message: "_id and newName are required." });
  }

  try {
    const collection = await Collection.findById(_id);
    if (!collection) {
      return res.status(404).json({ message: "Collection not found." });
    }

    collection.name = newName;
    await collection.save();
    res
      .status(200)
      .json({ message: "Collection renamed successfully.", collection });
  } catch (error) {
    res.status(500).json({ message: "Internal server error." });
    console.error("Error in renameCollection controller\n", error);
  }
};

const getCollectionsAggregatePipeline = (
  userId,
  requestingUserId = null,
  slug = null,
  includeNoteCollaborators = false,
) => {
  const requestingUserIdObj = requestingUserId
    ? new mongoose.Types.ObjectId(requestingUserId)
    : null;
  const userIdObj = new mongoose.Types.ObjectId(userId);

  const isOwner = requestingUserId && userIdObj.equals(requestingUserIdObj);
  const isCollaborator = requestingUserId && !isOwner;

  // Base note projection
  const noteProjection = {
    _id: 1,
    name: 1,
    slug: 1,
    visibility: 1,
    createdAt: 1,
    updatedAt: 1,
  };

  if (includeNoteCollaborators) {
    noteProjection.collaborators = 1;
  }

  return [
    {
      $match: {
        $and: [
          { userId: userIdObj },
          {
            $or: [
              { visibility: "public" },
              ...(isOwner ? [{}] : []),
              ...(isCollaborator
                ? [{ collaborators: requestingUserIdObj }]
                : []),
            ],
          },
          ...(slug ? [{ slug: slug.toLowerCase() }] : []),
        ],
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "collaborators",
        foreignField: "_id",
        as: "collaborators",
        pipeline: [
          {
            $project: {
              _id: 1,
              role: 1,
              fullName: 1,
              userName: 1,
              avatar: 1,
              email: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "notes",
        let: { collectionId: "$_id" }, // ✅ defining collectionId here
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$collectionId", "$$collectionId"] },
                  {
                    $or: [
                      { $eq: ["$visibility", "public"] },
                      ...(isOwner ? [{}] : []),
                      ...(isCollaborator
                        ? [
                            {
                              $in: [requestingUserIdObj, "$collaborators"], // ✅ checking note.collaborators
                            },
                          ]
                        : []),
                    ],
                  },
                ],
              },
            },
          },
          {
            $project: noteProjection,
          },
          ...(includeNoteCollaborators
            ? [
                {
                  $lookup: {
                    from: "users",
                    localField: "collaborators",
                    foreignField: "_id",
                    as: "collaborators",
                    pipeline: [
                      {
                        $project: {
                          _id: 1,
                          role: 1,
                          fullName: 1,
                          userName: 1,
                          avatar: 1,
                          email: 1,
                        },
                      },
                    ],
                  },
                },
              ]
            : []),
        ],
        as: "notes",
      },
    },
    {
      $addFields: {
        isRequesterCollaborator: isCollaborator,
        isOwner: isOwner,
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        slug: 1,
        visibility: 1,
        userId: 1,
        createdAt: 1,
        updatedAt: 1,
        notes: 1,
        collaborators: {
          $cond: {
            if: { $or: ["$isOwner", "$isRequesterCollaborator"] },
            then: "$collaborators",
            else: "$$REMOVE",
          },
        },
      },
    },
  ];
};

export const getAllCollections = async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: "userId not provided" });
  }
  try {
    const requestingUserId = req.user?._id; // Check if user is authenticated
    const pipeline = getCollectionsAggregatePipeline(
      userId,
      requestingUserId,
      null,
      true,
    );
    const collections = await Collection.aggregate(pipeline);

    res.status(200).json({ collections });
  } catch (error) {
    res.status(500).json({ message: "Internal server error." });
    console.error("Error in getAllCollections controller\n", error);
  }
};

export const getCollection = async (req, res) => {
  const { userId, slug } = req.query;

  if (!userId || !slug) {
    return res.status(400).json({ message: "userId and slug are required" });
  }

  try {
    const requestingUserId = req.user?._id; // Check if user is authenticated
    const existingCollection = await Collection.exists({
      userId: new mongoose.Types.ObjectId(userId),
      slug: slug.toLowerCase(),
    });
    if (!existingCollection) {
      return res.status(404).json({ message: "Collection not found" });
    }
    const pipeline = getCollectionsAggregatePipeline(
      userId,
      requestingUserId,
      slug.toLowerCase(),
      true, // Include note collaborators for getCollection
    );
    const collections = await Collection.aggregate(pipeline);

    if (!collections.length) {
      return res.status(403).json({ message: "Collection not accessible" });
    }

    res.status(200).json({ collection: collections[0] });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
    console.error("Error in getCollection controller\n", error);
  }
};

// controllers/collectionController.js
export const getCollectionBySlug = async (req, res) => {
  const { username, collectionSlug } = req.params;
  const requester = req.user || null;

  const normalizedUsername = username.trim().toLowerCase();
  const normalizedSlug = collectionSlug.trim().toLowerCase();
  const requesterId = requester?._id || null;
  const requesterIdObj = requesterId ? new mongoose.Types.ObjectId(requesterId) : null;

  const cacheKey = `collection:slug:${normalizedUsername}:${normalizedSlug}:user:${requesterId || "guest"}`;

  try {
    // Check cache
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    // STEP 1: Get user ID (cheap, uses index)
    const user = await User.findOne(
      { userName: normalizedUsername },
      { _id: 1, userName: 1, fullName: 1, avatar: 1 }
    ).lean();

    if (!user) {
      return res.status(404).json({ message: "User not found", code: "USER_NOT_FOUND" });
    }

    // STEP 2: Get collection with basic info (cheap, uses index)
    const collection = await Collection.findOne(
      { 
        userId: user._id, 
        slug: normalizedSlug,
        $or: [
          { visibility: "public" },
          ...(requesterId ? [
            { userId: requesterIdObj },
            { collaborators: requesterIdObj }
          ] : [])
        ]
      },
      { _id: 1, name: 1, slug: 1, visibility: 1, userId: 1, createdAt: 1, updatedAt: 1, collaborators: 1 }
    ).lean();

    if (!collection) {
      // Check if collection exists but no access
      const exists = await Collection.exists({ userId: user._id, slug: normalizedSlug });
      if (exists) {
        return res.status(403).json({ message: "Access denied", code: "ACCESS_DENIED" });
      }
      return res.status(404).json({ message: "Collection not found", code: "COLLECTION_NOT_FOUND" });
    }

    // STEP 3: Get notes (separate query, but fast with indexes)
    const notes = await Note.find(
      {
        collectionId: collection._id,
        $or: [
          { visibility: "public" },
          ...(requesterId ? [
            { userId: requesterIdObj },
            { collaborators: requesterIdObj }
          ] : [])
        ]
      },
      {
        _id: 1,
        name: 1,
        slug: 1,
        visibility: 1,
        createdAt: 1,
        updatedAt: 1,
        contentUpdatedAt: 1,
        userId: 1,
        collaborators: 1,
        // content: { $substr: ["$content", 0, 200] } // Preview only
      }
    )
    .sort({ createdAt: -1 })
    .lean();

    // STEP 4: Get collaborator details (only if needed)
    const collaboratorIds = [];
    if (collection.collaborators?.length) {
      collaboratorIds.push(...collection.collaborators);
    }
    
    notes.forEach(note => {
      if (note.collaborators?.length) {
        collaboratorIds.push(...note.collaborators);
      }
    });

    // Get unique collaborator IDs
    const uniqueCollabIds = [...new Set(collaboratorIds.map(id => id.toString()))];
    
    // Fetch all collaborator details in one query
    const collaborators = uniqueCollabIds.length > 0 
      ? await User.find(
          { _id: { $in: uniqueCollabIds } },
          { _id: 1, userName: 1, fullName: 1, avatar: 1, email: 1, role: 1 }
        ).lean()
      : [];

    // Create maps for quick lookup
    const collaboratorMap = new Map(collaborators.map(c => [c._id.toString(), c]));

    // STEP 5: Attach collaborators to collection (if user has permission)
    const canSeeCollectionCollabs = requesterId && (
      collection.userId.toString() === requesterId.toString() ||
      collection.collaborators?.some(id => id.toString() === requesterId.toString())
    );

    const collectionWithCollabs = {
      ...collection,
      collaborators: canSeeCollectionCollabs 
        ? (collection.collaborators?.map(id => collaboratorMap.get(id.toString())).filter(Boolean) || [])
        : undefined
    };

    // STEP 6: Attach collaborators to notes (if user has permission)
    const notesWithCollabs = notes.map(note => {
      const canSeeNoteCollabs = requesterId && (
        note.userId?.toString() === requesterId.toString() ||
        collection.userId.toString() === requesterId.toString() || // Collection owner
        note.collaborators?.some(id => id.toString() === requesterId.toString()) ||
        collection.collaborators?.some(id => id.toString() === requesterId.toString()) // Collection collaborator
      );

      return {
        ...note,
        collaborators: canSeeNoteCollabs
          ? (note.collaborators?.map(id => collaboratorMap.get(id.toString())).filter(Boolean) || [])
          : undefined
      };
    });

    // STEP 7: Prepare response
    const responseData = {
      message: "Collection fetched successfully",
      collection: {
        ...collectionWithCollabs,
        notes: notesWithCollabs,
        noteCount: notes.length
      },
      author: {
        _id: user._id,
        userName: user.userName,
        fullName: user.fullName,
        avatar: user.avatar
      }
    };

    // Cache for 5 minutes
    await setCache(cacheKey, responseData, 300);

    return res.status(200).json(responseData);

  } catch (error) {
    console.error("Error in getCollectionBySlug:", error);
    return res.status(500).json({ message: "Internal server error", code: "SERVER_ERROR" });
  }
};

export const updateVisibility = async (req, res) => {
  const { visibility, collectionId } = req.body;
  const { user } = req;

  if (!user) return res.status(401).json({ message: "You are unauthorized" });
  if (!visibility || !collectionId) {
    return res.status(400).json({
      message: "all fields required [`visibility`, `collectionId`]",
    });
  }

  try {
    const collection = await Collection.findOneAndUpdate(
      { _id: collectionId, userId: user._id },
      { visibility },
      { new: true },
    );
    if (!collection) {
      return res
        .status(403)
        .json({ message: "you don't have permission to update it" });
    }
    return res.status(200).json({
      message: `visiblity updated to ${collection.visibility}`,
      collection,
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
  let { collaborators, collectionId } = req.body;
  const { user } = req;

  if (!user) return res.status(401).json({ message: "You are unauthorized" });
  if (!Array.isArray(collaborators) || !collectionId) {
    return res.status(400).json({
      message: "all fields required [`collaborators: Array`, `collectionId`]",
    });
  }
  collaborators = [...new Set(collaborators)];

  try {
    // Update the collection's collaborators
    const updatedCollection = await Collection.findOneAndUpdate(
      { _id: collectionId, userId: user._id },
      { collaborators },
      { new: true },
    ).populate("collaborators", "role fullName userName email avatar _id");

    if (!updatedCollection) {
      return res.status(404).json({
        message:
          "collection not found or you don't have permission to update it",
      });
    }

    return res.status(200).json({
      message: "Collaborators updated and populated successfully",
      collection: updatedCollection,
    });
  } catch (error) {
    console.error("Error in updateCollaborators controller:", error);
    return res.status(500).json({
      message: "Failed to update collaborators",
      error: error.message,
    });
  }
};
