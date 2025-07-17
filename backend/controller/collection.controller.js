import mongoose from "mongoose";
import Collection from "../model/collection.model.js";
import Note from "../model/note.model.js";

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
      collaborators,
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
  slug = null
) => {
  const requestingUserIdObj = requestingUserId 
    ? new mongoose.Types.ObjectId(requestingUserId)
    : null;
  const userIdObj = new mongoose.Types.ObjectId(userId);

  const isOwner = requestingUserId && userIdObj.equals(requestingUserIdObj);
  const isCollaborator = requestingUserId && !isOwner;

  return [
    {
      $match: {
        $and: [
          { userId: userIdObj },
          {
            $or: [
              { visibility: "public" },
              ...(isOwner ? [{}] : []),
              ...(isCollaborator ? [{
                collaborators: requestingUserIdObj
              }] : [])
            ]
          },
          ...(slug ? [{ slug: slug.toLowerCase() }] : [])
        ]
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "collaborators",
        foreignField: "_id",
        as: "collaborators",
        pipeline: [{
          $project: {
            _id: 1,
            fullName: 1,
            userName: 1,
            avatar: 1,
            email: 1
          }
        }]
      }
    },
    {
      $lookup: {
        from: "notes",
        let: { collectionId: "$_id", collabs: "$collaborators" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$collectionId", "$$collectionId"] },
              $or: [
                { visibility: "public" },
                ...(isOwner ? [{}] : []),
                ...(isCollaborator ? [{
                  $expr: {
                    $in: [requestingUserIdObj, "$$collabs._id"]
                  }
                }] : [])
              ]
            }
          },
          {
            $project: {
              _id: 1,
              name: 1,
              slug: 1,
              visibility: 1,
              createdAt: 1,
              updatedAt: 1
            }
          }
        ],
        as: "notes"
      }
    },
    {
      $addFields: {
        isRequesterCollaborator: isCollaborator,
        isOwner: isOwner
      }
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
            else: "$$REMOVE"
          }
        }
      }
    }
  ];
};


export const getAllCollections = async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: "userId not provided" });
  }

  try {
    const requestingUserId = req.user?._id; // Check if user is authenticated
    const pipeline = getCollectionsAggregatePipeline(userId, requestingUserId);
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
    const pipeline = getCollectionsAggregatePipeline(
      userId,
      requestingUserId,
      slug?.toLowerCase()
    );
    const collections = await Collection.aggregate(pipeline);

    if (!collections.length) {
      return res
        .status(404)
        .json({ message: "Collection not found or not accessible" });
    }

    res.status(200).json({ collection: collections[0] });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
    console.error("Error in getCollection controller\n", error);
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
      { new: true }
    );
    if (!collection) {
      return res.status(404).json({
        message:
          "collection not found or you don't have permission to update it",
      });
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
  const { collaborators, collectionId } = req.body;
  const { user } = req;

  if (!user) return res.status(401).json({ message: "You are unauthorized" });
  if (!Array.isArray(collaborators) || !collectionId) {
    return res.status(400).json({
      message: "all fields required [`collaborators: Array`, `collectionId`]",
    });
  }

  try {
    // Update the collection's collaborators
    const updatedCollection = await Collection.findOneAndUpdate(
      { _id: collectionId, userId: user._id },
      { collaborators },
      { new: true }
    ).populate("collaborators", "fullName userName email avatar _id"); 

    if (!updatedCollection) {
      return res.status(404).json({
        message: "collection not found or you don't have permission to update it",
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
