import streamifier from "streamifier";
import cloudinary from "../config/cloudinary.config.js";

// Optimization presets per image type
const UPLOAD_PRESETS = {
  avatar: {
    quality: "auto",
    fetch_format: "auto",
    width: 200,
    height: 200,
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
    width: 800,
    crop: "limit",
  },
  default: {
    quality: "auto",
    fetch_format: "auto",
  },
};

export const uploadStream = (buffer, folder = "default_folder", type = "default") => {
  return new Promise((resolve, reject) => {
    const preset = UPLOAD_PRESETS[type] || UPLOAD_PRESETS.default;

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        use_filename: false,
        unique_filename: true,
        ...preset,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      }
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