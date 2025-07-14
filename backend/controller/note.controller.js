import mongoose from "mongoose";
import Note from "../model/note.model.js";
import Collection from "../model/collection.model.js";
import User from "../model/user.model.js";

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
        return res.status(400).json({ message: "Name and collection ID are required" });
    }

    try {
        const note = await Note.create({ 
            name, 
            content,
            collectionId, 
            visibility,
            collaborators,
            userId: user._id 
        });
        return res.status(201).json({ 
            message: "Note created successfully", 
             note 
        });
    } catch (error) {
        console.error("Error in createNote controller:", error);
        return res.status(500).json({ 
            message: "Failed to create note",
            error: error.message 
        });
    }
}

export const deleteNote = async (req, res) => {
    const { _id } = req.params;
    const { user } = req;
    
    if (!_id) {
        return res.status(400).json({ 
            message: "Note ID not provided" 
        });
    }
    if (!mongoose.Types.ObjectId.isValid(_id)) {
        return res.status(400).json({ 
            message: "Invalid note ID format" 
        });
    }

    try {
        const note = await Note.findOneAndDelete({ _id, userId: user._id });
        
        if (!note) {
            return res.status(404).json({ 
                message: "Note not found or you don't have permission to delete it" 
            });
        }
        
        return res.status(200).json({ 
            message: "Note deleted successfully",
            noteId: _id 
        });
    } catch (error) {
        console.error("Error in deleteNote controller:", error);
        return res.status(500).json({ 
            message: "Failed to delete note",
            error: error.message 
        });
    }
}

export const getNote = async (req, res) => {
    const { _id } = req.params;
    const { user } = req;
    
    if (!_id) {
        return res.status(400).json({ 
            message: "Note ID not provided" 
        });
    }
    if (!mongoose.Types.ObjectId.isValid(_id)) {
        return res.status(400).json({ 
            message: "Invalid note ID format" 
        });
    }

    try {
        const note = await Note.findOne({ _id, userId: user._id });
        
        if (!note) {
            return res.status(404).json({ 
                message: "Note not found or you don't have permission to access it" 
            });
        }
        
        return res.status(200).json({ 
            message: "Note retrieved successfully",
             note 
        });
    } catch (error) {
        console.error("Error in getNote controller:", error);
        return res.status(500).json({ 
            message: "Failed to retrieve note",
            error: error.message 
        });
    }
}

export const getNoteBySlug = async (req, res) => {
  const { username, collectionSlug, noteSlug } = req.params;
  const requester = req.user || null;
  try {
    // 1. Find user by username
    const user = await User.findOne({ 
        userName: { $regex: new RegExp(`^${username}$`, 'i') } 
    });
        
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2. Find collection by user + slug
    const collection = await Collection.findOne({
      userId: user._id,
      slug: collectionSlug.toLowerCase(),
    });

    if (!collection) return res.status(404).json({ message: "Collection not found" });

    // 3. Find the note by collection + slug
    const note = await Note.findOne({
      collectionId: collection._id,
      slug: noteSlug.toLowerCase(),
    });

    if (!note) return res.status(404).json({ message: "Note not found" });

    // 4. Authorization check:
    const isOwner = requester && requester._id.equals(user._id);
    const isPublic = note.visibility === 'public';

    if (!isOwner && !isPublic) {
      return res.status(403).json({ message: "You don't have access to this note" });
    }

    return res.status(200).json({
      message: "Note fetched successfully",
      note
    });
  } catch (error) {
    console.error("Error fetching note by slug:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};


export const getNotes = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { user } = req;

    try {
        const notes = await Note.find({ userId: user._id })
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('-content');

        const totalNotes = await Note.countDocuments({ userId: user._id });
        const totalPages = Math.ceil(totalNotes / limit);

        return res.status(200).json({ 
            message: "Notes retrieved successfully",
            data : {
                notes,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalNotes,
                    notesPerPage: limit
                }
            }
        });
    } catch (error) {
        console.error("Error in getNotes controller:", error);
        return res.status(500).json({ 
            message: "Failed to retrieve notes",
            error: error.message 
        });
    }
}

export const updateContent = async (req, res) => {
    const { content, noteId } = req.body;
    const { user } = req;
    
    if (!noteId || content === undefined) {
        return res.status(400).json({ 
            message: "Note ID and content are required" 
        });
    }

    try {
        const note = await Note.findOneAndUpdate(
            { _id: noteId, userId: user._id },
            { content },
            { new: true }
        );
        
        if (!note) {
            return res.status(404).json({ 
                message: "Note not found or you don't have permission to update it" 
            });
        }
        
        return res.status(200).json({ 
            message: "Note content updated successfully",
             note 
        });
    } catch (error) {
        console.error("Error in updateContent controller:", error);
        return res.status(500).json({ 
            message: "Failed to update note content",
            error: error.message 
        });
    }
}

export const renameNote = async (req, res) => {
    const { noteId, newName } = req.body;
    const { user } = req;
    
    if (!noteId || !newName) {
        return res.status(400).json({ 
            message: "Note ID and new name are required" 
        });
    }

    try {
        const note = await Note.findOneAndUpdate(
            { _id: noteId, userId: user._id },
            { name: newName },
            { new: true }
        );
        
        if (!note) {
            return res.status(404).json({ 
                message: "Note not found or you don't have permission to rename it" 
            });
        }
        
        return res.status(200).json({ 
            message: "Note renamed successfully",
             note 
        });
    } catch (error) {
        console.error("Error in renameNote controller:", error);
        return res.status(500).json({ 
            message: "Failed to rename note",
            error: error.message 
        });
    }
}

export const moveTo = async (req, res) => {
    const { noteId, collectionId } = req.body;
    const { user } = req;
    
    if (!noteId || !collectionId) {
        return res.status(400).json({ 
            message: "Note ID and collection ID are required" 
        });
    }

    try {
        const note = await Note.findOneAndUpdate(
            { _id: noteId, userId: user._id },
            { collectionId },
            { new: true }
        );
        
        if (!note) {
            return res.status(404).json({ 
                message: "Note not found or you don't have permission to move it" 
            });
        }
        
        return res.status(200).json({ 
            message: "Note moved to new collection successfully",
             note 
        });
    } catch (error) {
        console.error("Error in moveTo note controller:", error);
        return res.status(500).json({ 
            message: "Failed to move note",
            error: error.message 
        });
    }
}