import { google } from "googleapis";
import { ENV } from "../config/env.js";
import redis from "../config/redis.js";

const REDIS_KEY = "gsc:tokens";
const SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"];
const SITE_URL = "https://notehub-official.vercel.app/";

const getOAuthClient = () => {
  console.log(`${ENV.BACKEND_URL}/api/admin/gsc/callback`);
  return new google.auth.OAuth2(
    ENV.GOOGLE_CLIENT_ID,
    ENV.GOOGLE_CLIENT_SECRET,
    `${ENV.BACKEND_URL}/api/admin/gsc/callback`,
  );
};

// ─── Step 1: redirect to Google consent ───────────────────────────────────────
export const getGscAuthUrl = (req, res) => {
  const oauth2Client = getOAuthClient();

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline", // required for refresh_token
    scope: SCOPES,
    prompt: "consent", // force consent so refresh_token is always returned
  });

  res.redirect(url);
};

// ─── Step 2: Google redirects here with ?code= ────────────────────────────────
export const gscCallback = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "Missing code from Google." });
  }

  try {
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return res.status(400).json({
        error:
          "No refresh token received. Revoke access at myaccount.google.com/permissions and try again.",
      });
    }

    await redis.set(REDIS_KEY, JSON.stringify(tokens));

    res.json({ message: "✅ GSC connected successfully." });
  } catch (err) {
    console.error("GSC callback error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─── Step 3: health check — uses stored tokens ────────────────────────────────
export const getGscHealth = async (req, res) => {
  try {
    const raw = await redis.get(REDIS_KEY);
    if (!raw) {
      return res.status(401).json({
        error: "GSC not connected. Visit /api/admin/gsc/auth first.",
      });
    }

    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials(JSON.parse(raw));

    // auto-save refreshed access token back to Redis
    oauth2Client.on("tokens", async (newTokens) => {
      const existing = JSON.parse((await redis.get(REDIS_KEY)) || "{}");
      await redis.set(REDIS_KEY, JSON.stringify({ ...existing, ...newTokens }));
      console.log("GSC token refreshed and saved to Redis.");
    });

    const sc = google.searchconsole({ version: "v1", auth: oauth2Client });

    const { data } = await sc.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate: "2024-01-01",
        endDate: new Date().toISOString().split("T")[0],
        dimensions: ["page"],
        rowLimit: 25000,
      },
    });

    const urls = data.rows?.map((r) => r.keys[0]) ?? [];

    res.json({
      totalIndexed: urls.length,
      urls,
    });
  } catch (err) {
    console.error("GSC health error:", err);
    res.status(500).json({ error: err.message });
  }
};
