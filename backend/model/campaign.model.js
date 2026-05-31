import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Template",
      required: true,
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      required: true,
    },
    extraJson: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["draft", "sending", "done", "failed"],
      default: "draft",
    },
    sentAt: {
      type: Date,
      default: null,
    },
    stats: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
    subject: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true },
);

const Campaign = mongoose.model("Campaign", campaignSchema);
export default Campaign;
