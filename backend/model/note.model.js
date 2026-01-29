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

/* ===================== INDEXES ===================== */

// Slug unique per collection
noteSchema.index({ collectionId: 1, slug: 1 }, { unique: true });

// Access rules
noteSchema.index({ userId: 1 });
noteSchema.index({ collaborators: 1 });

// Public feed + sorting
noteSchema.index({ visibility: 1, contentUpdatedAt: -1 });
noteSchema.index({ collectionId: 1, contentUpdatedAt: -1 });

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
