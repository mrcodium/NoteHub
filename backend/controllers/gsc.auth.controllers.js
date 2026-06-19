import redis from "../config/redis.js";
import {
  getOAuthClient,
  getSearchConsoleService,
  REDIS_KEY,
  SCOPES,
  SITE_URL,
  today,
  daysAgo,
} from "../config/gsc.client.js";

// ─── Step 1: Redirect to Google consent ───────────────────────────────────────
export const getGscAuthUrl = (req, res) => {
  const oauth2Client = getOAuthClient();

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent", // always return refresh_token
  });

  res.redirect(url);
};

// ─── Step 2: Google redirects here with ?code= ────────────────────────────────
export const gscCallback = async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: "Missing code from Google." });

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
    console.error("[GSC] Callback error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─── Step 3: Connection status ─────────────────────────────────────────────────
export const getGscStatus = async (req, res) => {
  try {
    const raw = await redis.get(REDIS_KEY);
    if (!raw) {
      return res.json({ connected: false });
    }

    const tokens = JSON.parse(raw);
    res.json({
      connected: true,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Step 4: Disconnect (revoke + delete from Redis) ──────────────────────────
export const disconnectGsc = async (req, res) => {
  try {
    const raw = await redis.get(REDIS_KEY);
    if (raw) {
      const tokens = JSON.parse(raw);
      const oauth2Client = getOAuthClient();
      oauth2Client.setCredentials(tokens);
      // Best-effort revoke — don't fail if Google rejects it
      await oauth2Client.revokeCredentials().catch(() => {});
    }

    await redis.del(REDIS_KEY);
    res.json({ message: "✅ GSC disconnected." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
