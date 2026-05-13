import mongoose from "mongoose";
import Collection from "../model/collection.model.js";
import Note from "../model/note.model.js";
import { getCache, setCache, cacheKeys, invalidateFeedsAndSearch, invalidateCollectionCache, invalidateNoteCache, fetchWithCache } from "../services/cache.service.js";
import User from "../model/user.model.js";
import { handleDbError } from "../utils/dbError.js";

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
    console.error("Error in createCollection controller\n", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
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

    const isAdmin = user.role === "admin";
    if (collection.userId.toString() !== user._id.toString() && !isAdmin) {
      return res.status(403).json({
        message:
          "Forbidden: you do not have permission to delete this collection.",
      });
    }

    // deleting associated notes as well.
    await Note.deleteMany({ collectionId: _id });
    await Collection.findByIdAndDelete(_id);

    // Invalidate cache
    const owner = await User.findById(collection.userId);
    await invalidateCollectionCache(owner.userName, collection.slug);
    await invalidateFeedsAndSearch();

    res.status(200).json({ message: "Collection deleted successfully." });
  } catch (error) {
    console.error("Error in deleteCollection controller\n", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

export const renameCollection = async (req, res) => {
  const { _id, newName, newSlug } = req.body;
  const { user } = req;

  if (!_id || !newName) {
    return res.status(400).json({ message: "_id and newName are required." });
  }

  try {
    const collection = await Collection.findById(_id);
    if (!collection) {
      return res.status(404).json({ message: "Collection not found." });
    }

    const isAdmin = user.role === "admin";
    if (collection.userId.toString() !== user._id.toString() && !isAdmin) {
      return res.status(403).json({
        message: "You don't have permission to rename this collection.",
      });
    }

    const oldSlug = collection.slug;
    collection.name = newName;
    if (newSlug && newSlug !== oldSlug) {
      collection.slug = newSlug.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    }
    await collection.save();

    // Invalidate cache
    const owner = await User.findById(collection.userId);
    await invalidateCollectionCache(owner.userName, oldSlug);
    await invalidateCollectionCache(owner.userName, collection.slug);
    await invalidateFeedsAndSearch();

    res
      .status(200)
      .json({ message: "Collection renamed successfully.", collection });
  } catch (error) {
    console.error("Error in renameCollection controller\n", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

export const checkCollectionAvailability = async (req, res) => {
  const { slug, collectionId, userId } = req.query;
  const { user } = req;

  if (!user) return res.status(401).json({ message: "Unauthorized" });

  try {
    const targetUserId = user.role === "admin" && userId ? userId : user._id;

    const query = {
      userId: targetUserId,
      slug: slug.toLowerCase(),
    };

    if (collectionId && mongoose.Types.ObjectId.isValid(collectionId)) {

      query._id = { $ne: collectionId };
    }

    const exists = await Collection.exists(query);
    res.status(200).json({ available: !exists });
  } catch (error) {
    console.error("Error in checkCollectionAvailability:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getCollectionsAggregatePipeline = (
  userId,
  requester = null,
  slug = null,
  includeNoteCollaborators = false,
) => {
  const requestingUserId = requester?._id;
  const requestingUserIdStr = requestingUserId ? String(requestingUserId) : null;
  const userIdStr = userId ? String(userId) : null;

  const isOwner = requestingUserIdStr && userIdStr && requestingUserIdStr === userIdStr;
  const isAdmin = requester?.role === "admin";
  const isCollaborator = requestingUserId && !isOwner && !isAdmin;
  const hasFullAccess = isOwner || isAdmin;

  const userIdObj = userIdStr ? new mongoose.Types.ObjectId(userIdStr) : null;
  const requestingUserIdObj = requestingUserIdStr ? new mongoose.Types.ObjectId(requestingUserIdStr) : null;

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
          ...(userIdObj ? [{ userId: userIdObj }] : []),
          ...(hasFullAccess
            ? []
            : [
              {
                $or: [
                  { visibility: "public" },
                  ...(isCollaborator
                    ? [{ collaborators: requestingUserIdObj }]
                    : []),
                ],
              },
            ]),
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
                      ...(hasFullAccess ? [{ $eq: [true, true] }] : []),
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
        isAdmin: isAdmin,
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
            if: { $or: ["$isOwner", "$isAdmin", "$isRequesterCollaborator"] },
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
      req.user,
      null,
      true,
    );
    const collections = await Collection.aggregate(pipeline);

    res.status(200).json({ collections });
  } catch (error) {
    console.error("Error in getAllCollections controller\n", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
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
      req.user,
      slug.toLowerCase(),
      true, // Include note collaborators for getCollection
    );
    const collections = await Collection.aggregate(pipeline);

    if (!collections.length) {
      return res.status(403).json({ message: "Collection not accessible" });
    }

    res.status(200).json({ collection: collections[0] });
  } catch (error) {
    console.error("Error in getCollection controller\n", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

// controllers/collectionController.js
export const getCollectionBySlug = async (req, res) => {
  const { username, collectionSlug } = req.params;
  const requester = req.user || null;

  const normalizedUsername = username.trim().toLowerCase();
  const normalizedSlug = collectionSlug.trim().toLowerCase();
  const requesterId = requester?._id || null;
  const isAdmin = requester?.role === "admin";
  const requesterIdObj = (requesterId && mongoose.Types.ObjectId.isValid(requesterId)) ? new mongoose.Types.ObjectId(requesterId) : null;

  const cacheKey = cacheKeys.collection.bySlug(normalizedUsername, normalizedSlug, requesterId || "guest");

  try {
    const { data } = await fetchWithCache(cacheKey, async () => {
      const user = await User.findOne(
        { userName: normalizedUsername },
        { _id: 1, userName: 1, fullName: 1, avatar: 1 }
      ).lean();

      if (!user) {
        throw { status: 404, message: "User not found", code: "USER_NOT_FOUND" };
      }

      const collection = await Collection.findOne(
        {
          userId: user._id,
          slug: normalizedSlug,
          $or: [
            { visibility: "public" },
            ...(isAdmin ? [{ _id: { $exists: true } }] : []),
            ...(requesterId ? [
              { userId: requesterIdObj },
              { collaborators: requesterIdObj }
            ] : [])
          ]
        },
        { _id: 1, name: 1, slug: 1, visibility: 1, userId: 1, createdAt: 1, updatedAt: 1, collaborators: 1 }
      ).lean();

      if (!collection) {
        const exists = await Collection.exists({ userId: user._id, slug: normalizedSlug });
        if (exists) {
          throw { status: 403, message: "Access denied", code: "ACCESS_DENIED" };
        }
        throw { status: 404, message: "Collection not found", code: "COLLECTION_NOT_FOUND" };
      }

      const notes = await Note.find(
        {
          collectionId: collection._id,
          $or: [
            { visibility: "public" },
            ...(isAdmin ? [{ _id: { $exists: true } }] : []),
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
        }
      )
        .sort({ createdAt: -1 })
        .lean();

      const collaboratorIds = [];
      if (collection.collaborators?.length) {
        collaboratorIds.push(...collection.collaborators);
      }

      notes.forEach(note => {
        if (note.collaborators?.length) {
          collaboratorIds.push(...note.collaborators);
        }
      });

      const uniqueCollabIds = [...new Set(
        collaboratorIds
          .filter(id => id && mongoose.Types.ObjectId.isValid(id.toString()))
          .map(id => id.toString())
      )];

      const collaborators = uniqueCollabIds.length > 0
        ? await User.find(
          { _id: { $in: uniqueCollabIds } },
          { _id: 1, userName: 1, fullName: 1, avatar: 1, email: 1, role: 1 }
        ).lean()
        : [];

      const collaboratorMap = new Map(collaborators.map(c => [c._id.toString(), c]));

      const canSeeCollectionCollabs = isAdmin || (requesterId && (
        collection.userId.toString() === requesterId.toString() ||
        collection.collaborators?.some(id => id.toString() === requesterId.toString())
      ));



      const collectionWithCollabs = {
        ...collection,
        collaborators: canSeeCollectionCollabs
          ? (collection.collaborators?.map(id => collaboratorMap.get(id.toString())).filter(Boolean) || [])
          : undefined
      };

      const notesWithCollabs = notes.map(note => {
        const canSeeNoteCollabs = isAdmin || (requesterId && (
          note.userId?.toString() === requesterId.toString() ||
          collection.userId.toString() === requesterId.toString() ||
          note.collaborators?.some(id => id.toString() === requesterId.toString()) ||
          collection.collaborators?.some(id => id.toString() === requesterId.toString())
        ));

        return {
          ...note,
          collaborators: canSeeNoteCollabs
            ? (note.collaborators?.map(id => collaboratorMap.get(id.toString())).filter(Boolean) || [])
            : undefined
        };
      });

      return {
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
    }, 300);

    return res.status(200).json(data);

  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message, code: error.code });
    }
    console.error("Error in getCollectionBySlug:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
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
    const collection = await Collection.findById(collectionId);
    if (!collection) {
      return res.status(404).json({ message: "Collection not found" });
    }

    const isAdmin = user.role === "admin";
    if (collection.userId.toString() !== user._id.toString() && !isAdmin) {
      return res.status(403).json({
        message: "You don't have permission to update this collection's visibility.",
      });
    }

    collection.visibility = visibility;
    await collection.save();

    // Invalidate cache
    const owner = await User.findById(collection.userId);
    await invalidateCollectionCache(owner.userName, collection.slug);
    await invalidateFeedsAndSearch();

    return res.status(200).json({
      message: `visiblity updated to ${collection.visibility}`,
      collection,
    });
  } catch (error) {
    console.error("Error in updateVisibility controller:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
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
    const collection = await Collection.findById(collectionId);
    if (!collection) {
      return res.status(404).json({ message: "Collection not found" });
    }

    const isAdmin = user.role === "admin";
    if (collection.userId.toString() !== user._id.toString() && !isAdmin) {
      return res.status(403).json({
        message: "You don't have permission to update collaborators for this collection.",
      });
    }

    collection.collaborators = collaborators;
    await collection.save();

    // Invalidate cache
    const owner = await User.findById(collection.userId);
    await invalidateCollectionCache(owner.userName, collection.slug);
    await invalidateFeedsAndSearch();

    return res.status(200).json({
      message: "Collaborators updated successfully",
      collection: await collection.populate("collaborators", "role fullName userName email avatar _id"),
    });

  } catch (error) {
    console.error("Error in updateCollaborators controller:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};
