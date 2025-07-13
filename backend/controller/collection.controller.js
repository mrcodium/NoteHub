import mongoose from "mongoose";
import Collection from "../model/collection.model.js";
import Note from "../model/note.model.js";

export const createCollection = async (req, res) => {
    const { name } = req.body;
    const { user } = req;

    if (!user) {
        return res.status(401).json({ message: "Unauthorized: user not found." });
    }
    if (!name) {
        return res.status(400).json({ message: "Collection name is required." });
    }
    try {
        const existingCollection = await Collection.findOne({name, userId: user._id});
        if(existingCollection){
            return res.status(400).json({message: `The repository ${name} already exists on this account`})
        }

        const collection = await Collection.create({ name, userId: user._id });
        res.status(201).json({ 
            message: "Collection created successfully", 
            collection: {...collection._doc, notes: []}
        });
    } catch (error) {
        res.status(500).json({ message: "Internal server error." });
        console.error("Error in createCollection controller\n", error);
    }
};


export const deleteCollection = async (req, res) => {
    const { _id } = req.params;
    const { user } = req;

    if(!mongoose.Types.ObjectId.isValid(_id)){
        return res.status(400).json({message: "Invalid _id provided"});
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
            return res.status(403).json({ message: "Forbidden: you do not have permission to delete this collection." });
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
        res.status(200).json({ message: "Collection renamed successfully.", collection });
    } catch (error) {
        res.status(500).json({ message: "Internal server error." });
        console.error("Error in renameCollection controller\n", error);
    }
};

const getCollectionsAggregatePipeline = (userId, name = null) => {
    const matchStage = {
        userId: new mongoose.Types.ObjectId(userId),
        ...(name && { name })
    };

    return [
        { $match: matchStage },
        {
            $lookup: {
                from: "notes",
                localField: "_id",
                foreignField: "collectionId",
                as: "notes"
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                userId: 1,
                isGeneral: 1,
                createdAt: 1,
                updatedAt: 1,
                imageUrls: 1,
                notes: {
                    _id: 1,
                    name: 1,
                    createdAt: 1,
                    updatedAt: 1
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
        const pipeline = getCollectionsAggregatePipeline(userId);
        const collections = await Collection.aggregate(pipeline);
        res.status(200).json({ collections });
    } catch (error) {
        res.status(500).json({ message: "Internal server error." });
        console.error("Error in getAllCollections controller\n", error);
    }
};

export const getCollection = async (req, res) => {
    const { userId, name } = req.query;
    if (!userId || !name) {
        return res.status(400).json({ message: "userId and name are required" });
    }

    try {
        const pipeline = getCollectionsAggregatePipeline(userId, name);
        const collection = await Collection.aggregate(pipeline);

        if (!collection.length) {
            return res.status(404).json({ message: "Collection not found" });
        }

        res.status(200).json({ collection: collection[0] });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
        console.error("Error in getCollection controller\n", error);
    }
};
