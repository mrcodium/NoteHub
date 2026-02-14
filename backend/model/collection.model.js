import mongoose from "mongoose";

const collectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "private",
    },
    slug: { type: String, required: true, unique: true },
    collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/* ===================== COLLECTION MODEL INDEXES ===================== */
// Primary unique constraint (your existing)
collectionSchema.index({ userId: 1, slug: 1 }, { unique: true }); // ✅ Keep this

// OPTIMIZED: For getAllCollections and getCollection pipelines
// This covers: userId + visibility filtering + slug (when provided)
collectionSchema.index({ 
  userId: 1, 
  visibility: 1, 
  slug: 1 
}); // 🔥 CRITICAL: Supports $match in getCollectionsAggregatePipeline

// For collaborator-based access
collectionSchema.index({ 
  collaborators: 1, 
  visibility: 1,
  userId: 1 
}); // 🔥 Supports $match with collaborator + visibility + userId

/* ===================== SLUG GENERATOR ===================== */
collectionSchema.pre("validate", async function (next) {
  if (!this.slug && this.name) {
    const baseSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    let slug = baseSlug;
    let counter = 1;

    while (
      await this.constructor.exists({
        userId: this.userId,
        slug,
        _id: { $ne: this._id },
      })
    ) {
      slug = `${baseSlug}-${counter++}`;
    }

    this.slug = slug;
  }

  // Owner must never be collaborator
  if (this.collaborators?.length) {
    this.collaborators = this.collaborators.filter(
      (id) => !id.equals(this.userId),
    );
  }

  next();
});

const Collection = mongoose.model("Collection", collectionSchema);
export default Collection;
