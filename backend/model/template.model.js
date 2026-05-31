import mongoose from "mongoose";

const templateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    htmlBody: {
      type: String,
      required: true,
    },
    previewText: {
      type: String,
      default: "",
      trim: true,
    },
    mode: {
      type: String,
      enum: ["shared", "per_recipient"],
      default: "shared",
    },
  },
  { timestamps: true },
);

const Template = mongoose.model("Template", templateSchema);
export default Template;
