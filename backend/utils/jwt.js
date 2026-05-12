// utils/jwt.js
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "dotenv";
import { durationToMs } from "./time.util.js";
import { ENV } from "../config/env.js";

config();

/* ---------------- COOKIE HELPERS ---------------- */

// Issue 5A fixed: "strict" blocks cookies on cross-origin requests (Vercel → Render).
// In production use "none" (requires secure:true, already set below).
// In development use "lax" so cookies work with local http.
// Issue 5B: Domain is intentionally omitted for cross-origin setups;
// sameSite "none" handles scoping without a shared parent domain.
const getCookieOptions = (maxAgeMs) => ({
  httpOnly: true,
  secure: ENV.NODE_ENV === "production",
  sameSite: ENV.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
  maxAge: maxAgeMs,
});

export const setAuthCookies = (res, accessToken, refreshToken) => {
  // Access token: 15 minutes (or from env, e.g., '15m')
  const accessMaxAge = durationToMs(ENV.JWT_EXPIRY || "15m");
  res.cookie("accessToken", accessToken, getCookieOptions(accessMaxAge));

  // Refresh token: based on REFRESH_TOKEN_EXPIRY_DAYS
  const refreshMaxAge = ENV.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  res.cookie("refreshToken", refreshToken, getCookieOptions(refreshMaxAge));
};

export const clearAuthCookies = (res) => {
  const options = {
    httpOnly: true,
    secure: ENV.NODE_ENV === "production",
    sameSite: ENV.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  };
  res.clearCookie("accessToken", options);
  res.clearCookie("refreshToken", options);
  res.clearCookie("jwt", options); // clear legacy cookie
};

/* ---------------- JWT HELPERS ---------------- */

export const generateAccessToken = (payload) => {
  return jwt.sign(
    {
      ...payload, // { userId, sessionId, role }
      iss: ENV.JWT_ISSUER || "notehub-api",
      aud: ENV.JWT_AUDIENCE || "notehub-web",
    },
    ENV.JWT_SECRET,
    {
      expiresIn: ENV.JWT_EXPIRY || "15m",
      algorithm: "HS256",
    }
  );
};

export const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

export const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, ENV.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: ENV.JWT_ISSUER || "notehub-api",
      audience: ENV.JWT_AUDIENCE || "notehub-web",
    });
  } catch (error) {
    throw error;
  }
};

