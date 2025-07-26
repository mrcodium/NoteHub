import mongoose from "mongoose";
import Note from "../model/note.model.js";
import Collection from "../model/collection.model.js";
import User from "../model/user.model.js";
import { canAccessNote } from "../utils/permissions.js";

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

// Public collection  + Public note  → Everyone
// Public collection  + Private note → Owner + Note collaborators
// Private collection + Public note  → Owner + Collection collaborators
// Private collection + Private note → Owner + (Note AND Collection

export const getNoteBySlug = async (req, res) => {
  const { username, collectionSlug, noteSlug } = req.params;
  const requester = req.user || null;

  try {
    const user = await User.findOne({
      userName: { $regex: new RegExp(`^${username}$`, 'i') },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    const collection = await Collection.findOne({
      userId: user._id,
      slug: collectionSlug.toLowerCase(),
    });

    if (!collection) return res.status(404).json({ message: "Collection not found" });

    const note = await Note.findOne({
      collectionId: collection._id,
      slug: noteSlug.toLowerCase(),
    });

    if (!note) return res.status(404).json({ message: "Note not found" });

    const accessAllowed = canAccessNote({ requester, ownerId: user._id, note, collection });

    if (!accessAllowed) {
      return res.status(403).json({ message: "You don't have access to this note" });
    }

    return res.status(200).json({
      message: "Note fetched successfully",
      note,
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
        { visibility: 'public' },
        { 
          visibility: 'private',
          $or: [
            { userId: requesterId },
            { collaborators: requesterId }
          ]
        }
      ]
    })
    .select('_id visibility collaborators userId')
    .lean();

    // Get notes from these collections
    const notes = await Note.find({
      collectionId: { $in: accessibleCollections.map(c => c._id) }
    })
    .populate('userId', '_id userName fullName avatar')
    .populate('collectionId', '_id name slug visibility collaborators userId')
    .sort({ updatedAt: -1 })
    .lean();

    // Filter notes based on access rules
    const accessibleNotes = notes.filter(note => {
      const collection = accessibleCollections.find(c => 
        c._id.toString() === note.collectionId._id.toString()
      );
      return canAccessNote({
        requester,
        ownerId: note.userId._id,
        note,
        collection: collection || note.collectionId
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
          hasMore: page < totalPages
        }
      }
    });

  } catch (error) {
    console.error("Error in getPublicNotes controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve notes",
      error: error.message
    });
  }
};


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

export const updateVisibility = async (req, res) => {
    const {noteId, visibility} = req.body;
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
      { new: true }
    );
    if (!note) {
      return res.status(404).json({
        message:
          "note not found or you don't have permission to update it",
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
      { new: true }
    ).populate("collaborators", "fullName userName email avatar _id");

    if (!updatedNote) {
      return res.status(404).json({
        message:
          "note not found or you don't have permission to update it",
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