import User from "../model/user.model.js";
import { ENV } from "../config/env.js";
import crypto from "crypto";

// ─── Encryption helpers ────────────────────────────────────────────────────────
const ALGO = "aes-256-cbc";
const KEY = Buffer.from(ENV.ENCRYPTION_KEY, "hex"); // 64-char hex in .env
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(text) {
  // Guard: plaintext tokens stored before encryption was added won't have the ":" separator
  if (!text || !text.includes(":")) return text;
  const [ivHex, encHex] = text.split(":");
  if (!ivHex || !encHex) return text; // fallback to raw value
  try {
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encHex, "hex");
    const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString();
  } catch {
    // Token was stored before encryption — return as-is and let the caller handle it
    return text;
  }
}

// ─── GitHub GraphQL query for contribution calendar ────────────────────────────
const CONTRIBUTIONS_QUERY = `
  query($userName: String!) {
    user(login: $userName) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              color
            }
          }
        }
      }
    }
  }
`;

// ─── Controllers ──────────────────────────────────────────────────────────────

export const connectGithub = async (req, res) => {
  try {
    const params = new URLSearchParams({
      client_id: ENV.GITHUB_CLIENT_ID,
      redirect_uri: ENV.GITHUB_REDIRECT_URI,
      scope: "read:user",
      // Store userId as state for CSRF protection during callback
      state: req.user._id.toString(),
    });
    res.status(200).json({
      url: `https://github.com/login/oauth/authorize?${params.toString()}`,
    });
  } catch (error) {
    console.error("Error in connectGithub:", error);
    res.status(500).json({ message: "Failed to initiate GitHub connection" });
  }
};

// NOTE: This callback is hit by a BROWSER redirect from GitHub.
// protectRoute reads cookies which the browser sends automatically, so req.user is available.
export const githubCallback = async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    console.error("GitHub callback: no code provided");
    return res.redirect(`${ENV.FRONTEND_URL}/settings/profile?github=error&reason=no_code`);
  }

  // CSRF: state must match the logged-in user's ID
  if (!req.user || state !== req.user._id.toString()) {
    console.error("GitHub callback: state mismatch or no user", { state, userId: req.user?._id });
    return res.redirect(`${ENV.FRONTEND_URL}/settings/profile?github=error&reason=state_mismatch`);
  }

  try {
    // 1. Exchange code for access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: ENV.GITHUB_CLIENT_ID,
        client_secret: ENV.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: ENV.GITHUB_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("GitHub OAuth error:", tokenData.error_description);
      return res.redirect(`${ENV.FRONTEND_URL}/settings/profile?github=error&reason=oauth_failed`);
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch GitHub user info to get the username
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "NoteHub",
      },
    });

    if (!userResponse.ok) {
      console.error("GitHub user fetch failed:", userResponse.status);
      return res.redirect(`${ENV.FRONTEND_URL}/settings/profile?github=error&reason=user_fetch_failed`);
    }

    const githubUser = await userResponse.json();

    // 3. Save encrypted token to DB
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.redirect(`${ENV.FRONTEND_URL}/settings/profile?github=error&reason=user_not_found`);
    }

    user.github = {
      username: githubUser.login,
      accessToken: encrypt(accessToken), // stored encrypted
      connectedAt: new Date(),
    };

    await user.save();
    console.log(`GitHub connected for user ${user.userName} → @${githubUser.login}`);

    res.redirect(`${ENV.FRONTEND_URL}/${user.userName}?github=success`);
  } catch (error) {
    console.error("Error in githubCallback:", error);
    res.redirect(`${ENV.FRONTEND_URL}/settings/profile?github=error&reason=server_error`);
  }
};

export const disconnectGithub = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.github = undefined;
    await user.save();

    res.status(200).json({ success: true, message: "GitHub disconnected successfully" });
  } catch (error) {
    console.error("Error in disconnectGithub:", error);
    res.status(500).json({ message: "Failed to disconnect GitHub" });
  }
};

/**
 * GET /api/auth/github/contributions/:username
 * Public endpoint — uses the profile owner's stored GitHub token to call
 * the official GitHub GraphQL API for their contribution calendar.
 */
export const getGithubContributions = async (req, res) => {
  const { username } = req.params; // NoteHub username

  try {
    // 1. Find the NoteHub user and get their stored GitHub info
    const user = await User.findOne({ userName: username.toLowerCase() }).select(
      "+github.accessToken +github.username"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.github?.username || !user.github?.accessToken) {
      return res.status(404).json({ message: "GitHub account not connected for this user" });
    }

    // 2. Decrypt the stored token (handles both legacy plaintext and new encrypted tokens)
    const accessToken = decrypt(user.github.accessToken);

    // 3. Call official GitHub GraphQL API
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "User-Agent": "NoteHub",
      },
      body: JSON.stringify({
        query: CONTRIBUTIONS_QUERY,
        variables: { userName: user.github.username },
      }),
    });

    if (!response.ok) {
      console.error("GitHub GraphQL HTTP error:", response.status, await response.text());
      return res.status(502).json({ message: "GitHub API request failed" });
    }

    const result = await response.json();

    if (result.errors?.length) {
      console.error("GitHub GraphQL errors:", result.errors);
      return res.status(502).json({ message: "GitHub GraphQL error", errors: result.errors });
    }

    const calendar = result.data?.user?.contributionsCollection?.contributionCalendar;

    if (!calendar) {
      return res.status(404).json({ message: "No contribution data found" });
    }

    // Shape matches GitHubContribution component exactly
    res.status(200).json({
      weeks: calendar.weeks,
      totalContributions: calendar.totalContributions,
    });
  } catch (error) {
    console.error("Error in getGithubContributions:", error);
    res.status(500).json({ message: "Failed to fetch GitHub contributions" });
  }
};