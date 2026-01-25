// models/SearchIndex.js
import mongoose from "mongoose";

const SearchIndexSchema = new mongoose.Schema(
  {
    lemma: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    notes: [
      {
        noteId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Note",
          required: true,
        },
        tf: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
  },
  { timestamps: true }
);

// compound index for fast lookup
SearchIndexSchema.index({ lemma: 1, "notes.noteId": 1 });

export default mongoose.model("SearchIndex", SearchIndexSchema);
