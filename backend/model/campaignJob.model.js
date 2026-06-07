import mongoose from "mongoose";

const campaignJobSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "sent", "failed", "skipped"],
      default: "pending",
    },
    brevoMessageId: {
      type: String,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },

    // ─── Tracking ──────────────────────────────────────────────
    openCount:      { type: Number, default: 0 },
    clickCount:     { type: Number, default: 0 },
    firstOpenedAt:  { type: Date, default: null },
    firstClickedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

campaignJobSchema.index({ campaignId: 1 });
campaignJobSchema.index({ campaignId: 1, status: 1 });
campaignJobSchema.index({ brevoMessageId: 1 }); // ← critical for webhook lookup speed

const CampaignJob = mongoose.model("CampaignJob", campaignJobSchema);
export default CampaignJob;