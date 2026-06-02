import mongoose from "mongoose";

const suppressedEmailSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    campaignId: {
      // the campaign that triggered the unsubscribe
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      default: null,
    },
    unsubscribedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Fast lookup during dispatch
suppressedEmailSchema.index({ email: 1 });

const SuppressedEmail = mongoose.model("SuppressedEmail", suppressedEmailSchema);
export default SuppressedEmail;