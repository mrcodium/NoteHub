import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    content: {
      type: String,
      default: ''
    },
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Collection'
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    },
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'private',
      required: true
    },
    collaborators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    slug: {
      type: String,
      sparse: true // no unique here
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// 🧠 Compound index: slug unique per collection
noteSchema.index({ collectionId: 1, slug: 1 }, { unique: true });
noteSchema.index({ userId: 1 });
noteSchema.index({ visibility: 1 });

// 🛠️ Slug generator scoped per collection
noteSchema.pre('save', async function (next) {
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
      const existingNote = await this.constructor.findOne({
        slug,
        collectionId: this.collectionId
      });

      if (!existingNote || existingNote._id.equals(this._id)) {
        isUnique = true;
      } else {
        slug = `${baseSlug}-${counter++}`;
      }
    }

    this.slug = slug;
  }
  next();
});

const Note = mongoose.model('Note', noteSchema);
export default Note;
