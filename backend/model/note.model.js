import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    content: {
      type: String,
      default: "",
    },

    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "private",
      required: true,
    },

    collaborators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    slug: {
      type: String,
      required: true,
    },

    contentUpdatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/* ===================== NOTE MODEL INDEXES ===================== */
// Primary unique constraint (your existing)
noteSchema.index({ collectionId: 1, slug: 1 }, { unique: true }); // ✅ Keep

// OPTIMIZED: For note filtering within collection (used in getCollectionsAggregatePipeline)
noteSchema.index({
  collectionId: 1,
  visibility: 1,
  collaborators: 1,
  createdAt: -1,
}); // 🔥 CRITICAL: Covers $match and $sort in notes lookup

// For getNoteBySlug pipeline
noteSchema.index({
  collectionId: 1,
  slug: 1,
  visibility: 1,
}); // 🔥 Supports note lookup with visibility

// For getPublicNotes (complex permission rules)
noteSchema.index({
  visibility: 1,
  contentUpdatedAt: -1,
}); // ✅ Keep for public feed

// For owner-based queries
noteSchema.index({
  userId: 1,
  visibility: 1,
  collectionId: 1,
}); // 🔥 For owner access checks

// For collaborator-based access
noteSchema.index({
  collaborators: 1,
  collectionId: 1,
  visibility: 1,
}); // 🔥 For collaborator access checks

/* ===================== MIDDLEWARE ===================== */

// Slug generator (MUST run before validation)
noteSchema.pre("validate", async function (next) {
  // Only generate slug if new note OR slug is missing
  if (!this.slug && this.name) {
    const baseSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    let slug = baseSlug;
    let counter = 1;

    while (
      await this.constructor.exists({
        collectionId: this.collectionId,
        slug,
        _id: { $ne: this._id },
      })
    ) {
      slug = `${baseSlug}-${counter++}`;
    }

    this.slug = slug;
  }

  next();
});

const Note = mongoose.model("Note", noteSchema);
export default Note;
