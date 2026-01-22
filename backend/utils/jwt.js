// utils/jwt.js
import jwt from "jsonwebtoken";
import { config } from "dotenv";
import { durationToMs } from "./time.util.js";

config();

/* ---------------- COOKIE HELPERS ---------------- */

export const setCookie = (res, name, value, options = {}) => {
  const defaultOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    path: "/",
    domain: process.env.COOKIE_DOMAIN || undefined,
    maxAge: durationToMs(process.env.JWT_EXPIRY || "30d"),
  };

  res.cookie(name, value, { ...defaultOptions, ...options });
};

export const clearCookie = (res, name = "jwt") => {
  res.clearCookie(name, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    domain: process.env.COOKIE_DOMAIN || undefined,
  });
};

/* ---------------- JWT HELPERS ---------------- */

export const generateToken = (payload) => {
  return jwt.sign(
    {
      ...payload, // { userId }
      iss: process.env.JWT_ISSUER || "notehub-api",
      aud: process.env.JWT_AUDIENCE || "notehub-web",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRY || "30d",
      algorithm: "HS256",
    }
  );
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: process.env.JWT_ISSUER || "your-app-name",
      audience: process.env.JWT_AUDIENCE || "your-app-client",
    });
  } catch {
    throw new Error("Invalid or expired token");
  }
};
