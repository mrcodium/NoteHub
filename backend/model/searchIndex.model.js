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
    noteIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Note",
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("SearchIndex", SearchIndexSchema);
