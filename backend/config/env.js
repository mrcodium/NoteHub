import dotenv from "dotenv";
dotenv.config();

const required = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`❌ CONFIG ERROR: ENV key "${key}" is missing.`);
  }
  return value;
};

export const ENV = {
  // Server
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || "development",
  
  JWT_SECRET: required("JWT_SECRET"),
  JWT_EXPIRY: required("JWT_EXPIRY"),
  JWT_ISSUER: required("JWT_ISSUER"),
  JWT_AUDIENCE: required("JWT_AUDIENCE"),

  MONGODB_URI: required("MONGODB_URI"),
  REDIS_HOST: required("REDIS_HOST"),
  REDIS_PORT: required("REDIS_PORT"),
  REDIS_PASSWORD: required("REDIS_PASSWORD"),

  CLOUDINARY_CLOUD_NAME: required("CLOUDINARY_CLOUD_NAME"),
  CLOUDINARY_API_KEY: required("CLOUDINARY_API_KEY"),
  CLOUDINARY_API_SECRET: required("CLOUDINARY_API_SECRET"),

  EMAIL_SENDER: required("EMAIL_SENDER"),
  EMAIL_PASS: required("EMAIL_PASS"),
  RESEND_API_KEY: required("RESEND_API_KEY"),
  BREVO_API_KEY: required("BREVO_API_KEY"),

  GITHUB_TOKEN: required("GITHUB_TOKEN"),

  GOOGLE_CLIENT_ID: required("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: required("GOOGLE_CLIENT_SECRET"),
  GOOGLE_REDIRECT_URI: required("GOOGLE_REDIRECT_URI"),

  VITE_API_URL: required("VITE_API_URL"),
};
