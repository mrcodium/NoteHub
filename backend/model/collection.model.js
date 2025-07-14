import mongoose from "mongoose";

const collectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'private',
      required: true
    },
    slug: {
      type: String,
      sparse: true // no unique here
    },
    collaborators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// 🧠 Compound index: slug unique per user
collectionSchema.index({ userId: 1, slug: 1 }, { unique: true });
collectionSchema.index({ name: 1, userId: 1 }, { unique: true });
collectionSchema.index({ visibility: 1 });
collectionSchema.index({ collaborators: 1 });

// 🛠️ Slug generator scoped per user
collectionSchema.pre('save', async function (next) {
  if (this.isModified('name')) {
    const baseSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    let slug = baseSlug;
    let counter = 1;
    let isUnique = false;

    while (!isUnique) {
      const existing = await this.constructor.findOne({
        slug,
        userId: this.userId
      });

      if (!existing || existing._id.equals(this._id)) {
        isUnique = true;
      } else {
        slug = `${baseSlug}-${counter++}`;
      }
    }

    this.slug = slug;
  }
  next();
});

const Collection = mongoose.model('Collection', collectionSchema);
export default Collection;
