import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true, trim: true },
    subject:      { type: String, required: true, trim: true },
    previewText:  { type: String, default: "",    trim: true },
    htmlBody:     { type: String, required: true },
    extraJson:    { type: mongoose.Schema.Types.Mixed, default: {} },
    emails:       [{ type: String, trim: true, lowercase: true }],
    status:       { type: String, enum: ["draft", "sending", "done", "failed"], default: "draft" },
    sentAt:       { type: Date, default: null },
    stats: {
      total:      { type: Number, default: 0 },
      sent:       { type: Number, default: 0 },
      skipped:    { type: Number, default: 0 },
      failed:     { type: Number, default: 0 },
      opened:     { type: Number, default: 0 },  
      clicked:    { type: Number, default: 0 },  
    },
  },
  { timestamps: true },
);

const Campaign = mongoose.model("Campaign", campaignSchema);
export default Campaign;