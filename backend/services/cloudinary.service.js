import streamifier from "streamifier";
import cloudinary from "../config/cloudinary.config.js";

// Optimization presets per image type
const UPLOAD_PRESETS = {
  avatar: {
    quality: "auto:best",
    fetch_format: "auto",
    width: 400,
    height: 400,
    crop: "fill",
    gravity: "face", // smart face crop
  },
  cover: {
    quality: "auto",
    fetch_format: "auto",
    width: 1500,
    crop: "limit", // won't upscale
  },
  gallery: {
    quality: "auto",
    fetch_format: "auto",
  },
  default: {
    quality: "auto",
    fetch_format: "auto",
  },
  template_preview: {
    quality: "auto:low",
    fetch_format: "auto",
    width: 600,
    height: 800,
    crop: "limit",
  },
};

export const uploadStream = (
  buffer,
  folder = "default_folder",
  type = "default",
  fileMetadata = {},
) => {
  return new Promise((resolve, reject) => {
    const preset = UPLOAD_PRESETS[type] || UPLOAD_PRESETS.default;

    const isSvg =
      fileMetadata.mimetype === "image/svg+xml" ||
      (fileMetadata.originalname &&
        fileMetadata.originalname.toLowerCase().endsWith(".svg"));

    const isGif =
      fileMetadata.mimetype === "image/gif" ||
      (fileMetadata.originalname &&
        fileMetadata.originalname.toLowerCase().endsWith(".gif"));

    const uploadOptions = {
      folder,
      use_filename: false,
      unique_filename: true,
    };

    if (isSvg) {
      uploadOptions.format = "svg";
      uploadOptions.resource_type = "image";
    } else if (isGif) {
      // Preserve GIF as-is to keep animation intact; skip quality/format transforms
      uploadOptions.resource_type = "image";
    } else {
      Object.assign(uploadOptions, preset);
    }

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) return reject(error);
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      },
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// Fixed — strips transformation params before extracting publicId
const extractPublicIdFromUrl = (url) => {
  // Remove transformation segment like /f_auto,q_auto,w_800/ before matching
  const cleaned = url.replace(/\/upload\/[^/]+\/v\d+\//, "/upload/v_temp/");
  const matches = url.match(/upload\/(?:[^/]+\/)*v\d+\/(.+)\.[^.]+$/);
  return matches ? matches[1] : null;
};

export const deleteImage = async (imageUrl) => {
  try {
    if (!imageUrl) return;
    if (imageUrl.includes("lh3.googleusercontent.com")) return;

    const publicId = extractPublicIdFromUrl(imageUrl);
    if (!publicId) throw new Error("Invalid image URL");

    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw new Error("Failed to delete image");
  }
};
