import { google } from "googleapis";
import { ENV } from "../config/env.js";
import redis from "../config/redis.js";

export const REDIS_KEY   = "gsc:tokens";
export const SITE_URL    = "https://notehub-official.vercel.app/";
export const SCOPES      = ["https://www.googleapis.com/auth/webmasters.readonly"];

// ─── Build an OAuth2 client ───────────────────────────────────────────────────
export const getOAuthClient = () =>
  new google.auth.OAuth2(
    ENV.GOOGLE_CLIENT_ID,
    ENV.GOOGLE_CLIENT_SECRET,
    `${ENV.BACKEND_URL}/api/admin/gsc/callback`,
  );

// ─── Get an authenticated client with stored tokens ───────────────────────────
// Throws if GSC is not connected.
export const getAuthenticatedClient = async () => {
  const raw = await redis.get(REDIS_KEY);
  if (!raw) {
    const err = new Error("GSC not connected. Visit /api/admin/gsc/auth first.");
    err.status = 401;
    throw err;
  }

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(JSON.parse(raw));

  // Auto-save refreshed tokens back to Redis
  oauth2Client.on("tokens", async (newTokens) => {
    const existing = JSON.parse((await redis.get(REDIS_KEY)) || "{}");
    await redis.set(REDIS_KEY, JSON.stringify({ ...existing, ...newTokens }));
    console.log("[GSC] Token refreshed and saved to Redis.");
  });

  return oauth2Client;
};

// ─── Build an authenticated Search Console service ────────────────────────────
export const getSearchConsoleService = async () => {
  const auth = await getAuthenticatedClient();
  return google.searchconsole({ version: "v1", auth });
};

// ─── Date helpers ─────────────────────────────────────────────────────────────
export const today = () => new Date().toISOString().split("T")[0];

export const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
};
