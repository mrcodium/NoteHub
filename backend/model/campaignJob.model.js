import mongoose from "mongoose";

const campaignJobSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
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
  },
  { timestamps: true }
);

campaignJobSchema.index({ campaignId: 1 });
campaignJobSchema.index({ campaignId: 1, status: 1 });

const CampaignJob = mongoose.model("CampaignJob", campaignJobSchema);
export default CampaignJob;