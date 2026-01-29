import mongoose from "mongoose";

const collectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
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

    slug: {
      type: String,
      required: true,
    },

    collaborators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ===================== INDEXES ===================== */

// Slug unique per user
collectionSchema.index({ userId: 1, slug: 1 }, { unique: true });

// Access & filtering
collectionSchema.index({ visibility: 1, userId: 1 });
collectionSchema.index({ collaborators: 1 });

/* ===================== MIDDLEWARE ===================== */

// Slug generator + owner validation
collectionSchema.pre("save", async function (next) {
  // Generate slug if name changed
  if (this.isModified("name")) {
    const baseSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const exists = await this.constructor.findOne({
        userId: this.userId,
        slug,
        _id: { $ne: this._id },
      });

      if (!exists) break;
      slug = `${baseSlug}-${counter++}`;
    }

    this.slug = slug;
  }

  // Owner must never be collaborator
  if (this.collaborators?.length) {
    this.collaborators = this.collaborators.filter(
      (id) => !id.equals(this.userId)
    );
  }

  next();
});

const Collection = mongoose.model("Collection", collectionSchema);
export default Collection;
