// utils/jwt.js
import jwt from "jsonwebtoken";
import { config } from "dotenv";
import { durationToMs } from "./time.util.js";
import { ENV } from "../config/env.js";

config();

/* ---------------- COOKIE HELPERS ---------------- */

export const setCookie = (res, name, value, options = {}) => {
  const defaultOptions = {
    httpOnly: true,
    secure: ENV.NODE_ENV === "production",
    sameSite: "none",
    path: "/",
    domain: ENV.COOKIE_DOMAIN || undefined,
    maxAge: durationToMs(ENV.JWT_EXPIRY || "30d"),
  };

  res.cookie(name, value, { ...defaultOptions, ...options });
};

export const clearCookie = (res, name = "jwt") => {
  res.clearCookie(name, {
    httpOnly: true,
    secure: ENV.NODE_ENV === "production",
    path: "/",
    domain: ENV.COOKIE_DOMAIN || undefined,
  });
};

/* ---------------- JWT HELPERS ---------------- */

export const generateToken = (payload) => {
  return jwt.sign(
    {
      ...payload, // { userId }
      iss: ENV.JWT_ISSUER || "notehub-api",
      aud: ENV.JWT_AUDIENCE || "notehub-web",
    },
    ENV.JWT_SECRET,
    {
      expiresIn: ENV.JWT_EXPIRY || "30d",
      algorithm: "HS256",
    },
  );
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, ENV.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: ENV.JWT_ISSUER || "your-app-name",
      audience: ENV.JWT_AUDIENCE || "your-app-client",
    });
  } catch {
    throw new Error("Invalid or expired token");
  }
};
