import User from "../model/user.model.js";
import bcrypt from "bcryptjs";
import { clearAuthCookies, generateAccessToken, generateRefreshToken, hashToken, setAuthCookies } from "../utils/jwt.js";
import { createSession, deleteSession, deleteAllSessionsExcept, deleteAllUserSessions, getUserSessions, getSession } from "../utils/sessionStore.js";
import { sendOtp, validateOtp } from "../services/otp.service.js";
import { OAuth2Client } from "google-auth-library";
import { ENV } from "../config/env.js";
import { escape, isEmail, isLength, normalizeEmail } from "../utils/validator.js";
import { v4 as uuidv4 } from "uuid";
import { UAParser } from "ua-parser-js";

// Helper to get location from IP using ip-api with 2s timeout
const getLocationFromIp = async (ip) => {
  if (!ip || ip === "::1" || ip === "127.0.0.1") return "Localhost";
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`http://ip-api.com/json/${ip}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) return "Unknown Location";
    const data = await response.json();
    if (data.status === "success") {
      return `${data.city}, ${data.countryCode}`;
    }
  } catch (error) {
    // Fail silently
  }
  return "Unknown Location";
};

// common response functions
const sendAuthResponse = async (req, res, user) => {
  const sessionId = uuidv4();
  
  // Parse device info
  const parser = new UAParser(req.headers["user-agent"]);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const deviceName = `${browser.name || "Unknown Browser"} on ${os.name || "Unknown OS"}`;
  
  // Get IP
  const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket?.remoteAddress;
  const location = await getLocationFromIp(ip);

  const rawToken = generateRefreshToken();
  const refreshToken = `${user._id}:${sessionId}:${rawToken}`;
  const refreshTokenHash = hashToken(rawToken);

  // Save session
  await createSession({
    userId: user._id,
    sessionId,
    refreshTokenHash,
    deviceName,
    ip,
    location,
  });

  const accessToken = generateAccessToken({ userId: user._id, sessionId, role: user.role });
  
  setAuthCookies(res, accessToken, refreshToken);

  const { password, ...userWithoutPassword } = user.toObject();

  return res.status(200).json({
    user: userWithoutPassword,
    sessionId,
  });
};

const handleDbError = (error) => {
  return { status: 500, message: "Internal Server Error" };
};

export const signup = async (req, res) => {
  let { fullName, email, password: inputPassword, otp } = req.body;
  fullName = fullName?.trim();
  email = email?.trim();
  inputPassword = inputPassword?.trim();
  otp = otp?.trim();

  if (!fullName || !email || !inputPassword || !otp) {
    return res.status(400).json({ message: "All fields required." });
  }

  if (!isEmail(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  if (!isLength(inputPassword, { min: 6 })) {
    return res.status(400).json({
      message: "Password must contain at least 6 characters.",
    });
  }

  try {
    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const otpValidation = await validateOtp({
      email: normalizedEmail,
      purpose: "signup",
      otp,
    });
    if (otpValidation.status !== 200) {
      return res
        .status(otpValidation.status)
        .json({ message: otpValidation.message });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(inputPassword, salt);

    const newUser = await User.create({
      fullName: escape(fullName),
      email: normalizedEmail,
      password: hashedPassword,
    });

    return await sendAuthResponse(req, res, newUser);
  } catch (error) {
    console.error("error in signup controller: \n", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

export const sendSignupOtp = async (req, res) => {
  const { email } = req.body;
  try {
    if (!email?.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const result = await sendOtp({
      email: normalizeEmail(email),
      purpose: "signup",
    });
    res.status(result.status).json({ message: result.message });
  } catch (error) {
    console.error("error in sendSignupOtp\n", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier?.trim() || !password?.trim()) {
      return res.status(400).json({ message: "All fields required." });
    }

    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { userName: identifier }],
    }).select("+password");

    if (
      !user ||
      !user.password ||
      !(await bcrypt.compare(password, user.password))
    ) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    return await sendAuthResponse(req, res, user);
  } catch (error) {
    console.error("error in login controller: ", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

const client = new OAuth2Client(ENV.GOOGLE_CLIENT_ID, ENV.GOOGLE_CLIENT_SECRET);

export const googleLogin = async (req, res) => {
  const { code, codeVerifier, redirectUri } = req.body;
  if (!code?.trim() || !codeVerifier?.trim() || !redirectUri?.trim()) {
    return res.status(400).json({ message: "All fields required." });
  }

  const allowedRedirectUris = ENV.GOOGLE_REDIRECT_URIs.split(/\s*,\s*/)
    .map((uri) => uri.trim())
    .filter(Boolean);

  if (!allowedRedirectUris.includes(redirectUri)) {
    return res.status(400).json({
      message: "Redirect URI not allowed",
    });
  }

  try {
    const tokenEndpoint = `https://oauth2.googleapis.com/token`;
    const params = new URLSearchParams();
    params.append("code", code);
    params.append("client_id", ENV.GOOGLE_CLIENT_ID);
    params.append("client_secret", ENV.GOOGLE_CLIENT_SECRET);
    params.append("redirect_uri", redirectUri);
    params.append("grant_type", "authorization_code");
    params.append("code_verifier", codeVerifier);

    const tokenResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return res.status(400).json({ message: "Invalid authorization code." });
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: ENV.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email_verified) {
      return res.status(403).json({
        message: "Google email not verified.",
      });
    }

    const { email, sub: googleId, name: fullName, picture } = payload;
    const avatar = picture.replace(/=s96-c$/, "=s400-c");
    const normalizedEmail = normalizeEmail(email);

    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = await User.create({
        fullName: escape(fullName || ""),
        email: normalizedEmail,
        googleId,
        avatar,
        password: null,
        hasGoogleAuth: true,
      });
    } else {
      if (!user.googleId) {
        user.googleId = googleId;
        user.hasGoogleAuth = true;
      }
      if (!user.avatar) user.avatar = avatar;
      await user.save();
    }

    return await sendAuthResponse(req, res, user);
  } catch (error) {
    console.error("Error in Google login controller: ", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

export const logout = async (req, res) => {
  try {
    if (req.user && req.sessionId) {
      await deleteSession(req.user._id, req.sessionId);
    }
    clearAuthCookies(res);
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      clearAuthCookies(res);
      return res.status(401).json({ message: "No refresh token provided" });
    }

    const [userId, sessionId, rawToken] = refreshToken.split(":");
    if (!userId || !sessionId || !rawToken) {
      clearAuthCookies(res);
      return res.status(401).json({ message: "Invalid refresh token format" });
    }

    const sessionData = await getSession(userId, sessionId);
    if (!sessionData) {
      // Reuse detection: Wiping all sessions!
      await deleteAllUserSessions(userId);
      clearAuthCookies(res);
      return res.status(401).json({ message: "Session invalid or revoked. All sessions terminated." });
    }

    const expectedHash = hashToken(rawToken);
    if (sessionData.refreshTokenHash !== expectedHash) {
      await deleteAllUserSessions(userId);
      clearAuthCookies(res);
      return res.status(401).json({ message: "Invalid token hash. All sessions terminated." });
    }

    // Rotate
    await deleteSession(userId, sessionId);

    const user = await User.findById(userId);
    if (!user) {
      clearAuthCookies(res);
      return res.status(401).json({ message: "User not found" });
    }

    return await sendAuthResponse(req, res, user);
  } catch (error) {
    // Issue 6A fixed: always return 401 (not 500) so the Axios interceptor's
    // refresh guard (`url.includes("/auth/refresh")`) catches it uniformly.
    // A 500 here bypasses the guard and can trigger a retry storm.
    console.error("Refresh token error:", error);
    clearAuthCookies(res);
    return res.status(401).json({ message: "Session refresh failed" });
  }
};

export const getSessions = async (req, res) => {
  try {
    const userId = req.user._id;
    const currentSessionId = req.sessionId;

    const sessions = await getUserSessions(userId);
    
    // Map to response format
    const formattedSessions = sessions.map(s => ({
      sessionId: s.sessionId,
      deviceName: s.deviceName,
      ip: s.ip,
      location: s.location,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      isCurrent: s.sessionId === currentSessionId,
    }));

    return res.status(200).json({ sessions: formattedSessions });
  } catch (error) {
    console.error("getSessions error:", error);
    return res.status(500).json({ message: "Failed to fetch sessions" });
  }
};

export const logoutOthers = async (req, res) => {
  try {
    const userId = req.user._id;
    const currentSessionId = req.sessionId;
    
    await deleteAllSessionsExcept(userId, currentSessionId);
    return res.status(200).json({ message: "Logged out all other devices" });
  } catch (error) {
    console.error("logoutOthers error:", error);
    return res.status(500).json({ message: "Failed to logout other devices" });
  }
};

export const killSession = async (req, res) => {
  try {
    const userId = req.user._id;
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ message: "Session ID required" });
    }

    await deleteSession(userId, sessionId);

    if (sessionId === req.sessionId) {
      clearAuthCookies(res);
      return res.status(200).json({ message: "Current session logged out" });
    }

    return res.status(200).json({ message: "Session terminated" });
  } catch (error) {
    console.error("killSession error:", error);
    return res.status(500).json({ message: "Failed to terminate session" });
  }
};

