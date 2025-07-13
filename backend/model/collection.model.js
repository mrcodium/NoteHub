import mongoose from "mongoose";

const collectionSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        isGeneral: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

collectionSchema.index({ name: 1, userId: 1 }, { unique: true });

const Collection = mongoose.model('Collection', collectionSchema);
export default Collection;