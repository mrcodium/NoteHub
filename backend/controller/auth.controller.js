import User from "../model/user.model.js";
import bcrypt from "bcryptjs";
import { clearCookie, generateToken, setCookie } from "../utils/jwt.js";
import { sendOtp, validateOtp } from "../services/otp.service.js";
import { OAuth2Client } from "google-auth-library";
import validator from "validator";
import { ENV } from "../config/env.js";

// common response functions
const sendAuthResponse = (res, user) => {
  const token = generateToken({ userId: user._id });
  setCookie(res, "jwt", token);

  const { password, ...userWithoutPassword } = user.toObject();

  return res.status(200).json({
    user: userWithoutPassword,
  });
};

export const signup = async (req, res) => {
  let { fullName, email, password: inputPassword, otp } = req.body;
  fullName = fullName.trim();
  email = email.trim();
  inputPassword = inputPassword.trim();
  otp = otp.trim();

  if (!fullName || !email || !inputPassword || !otp) {
    return res.status(400).json({ message: "All fields required." });
  }

  // Validate email format
  if (!validator.isEmail(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  // Validate password strength
  if (!validator.isLength(inputPassword, { min: 6 })) {
    return res.status(400).json({
      message: "Password must contain at least 6 characters.",
    });
  }

  try {
    const normalizedEmail = validator.normalizeEmail(email);
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

    // password hashing
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(inputPassword, salt);

    // creating the user with temporary username
    const newUser = await User.create({
      fullName: validator.escape(fullName),
      email: normalizedEmail,
      password: hashedPassword,
    });

    return sendAuthResponse(res, newUser);
  } catch (error) {
    console.error("error in signup controller: \n", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const sendSignupOtp = async (req, res) => {
  const { email } = req.body;
  try {
    if (!email?.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const result = await sendOtp({
      email: validator.normalizeEmail(email),
      purpose: "signup",
    });
    res.status(result.status).json({ message: result.message });
  } catch (err) {
    res.status(err.status || 500).json({ message: "Internal server error" });
    console.log("error in sendSignupOtp\n", err);
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

    // Verify credentials
    if (
      !user ||
      !user.password ||
      !(await bcrypt.compare(password, user.password))
    ) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    return sendAuthResponse(res, user);
  } catch (error) {
    console.error("error in login controller: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Initialize without redirect URI
const client = new OAuth2Client(
  ENV.GOOGLE_CLIENT_ID,
  ENV.GOOGLE_CLIENT_SECRET,
);

export const googleLogin = async (req, res) => {
  const { code, codeVerifier, redirectUri } = req.body;
  // Input validation and trimming
  if (!code?.trim() || !codeVerifier?.trim() || !redirectUri?.trim()) {
    return res.status(400).json({ message: "All fields required." });
  }

  if (redirectUri !== ENV.GOOGLE_REDIRECT_URI) {
    return res.status(400).json({
      message: "Redirect URI mismatch",
    });
  }

  try {
    // Create token endpoint URL with all parameters
    const tokenEndpoint = `https://oauth2.googleapis.com/token`;
    const params = new URLSearchParams();
    params.append("code", code);
    params.append("client_id", ENV.GOOGLE_CLIENT_ID);
    params.append("client_secret", ENV.GOOGLE_CLIENT_SECRET);
    params.append("redirect_uri", redirectUri);
    params.append("grant_type", "authorization_code");
    params.append("code_verifier", codeVerifier);

    // Make direct HTTP request to token endpoint
    const tokenResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Google token exchange error:", tokens);
      return res.status(400).json({ message: "Invalid authorization code." });
    }

    // Verify ID token using the library
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: ENV.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email_verified) {
      return res.status(403).json({
        message:
          "Google email not verified. Please verify your email with Google first.",
      });
    }

    const { email, sub: googleId, name: fullName, picture } = payload;
    const avatar = picture.replace(/=s96-c$/, "=s400-c");
    const normalizedEmail = validator.normalizeEmail(email);

    // Find or create user (aligned with your signup flow)
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      // Create new user (like in signup)
      user = await User.create({
        fullName: validator.escape(fullName || ""),
        email: normalizedEmail,
        googleId,
        avatar,
        password: null,
        hasGoogleAuth: true,
      });
    } else {
      // Add Google auth to existing account
      if (!user.googleId) {
        user.googleId = googleId;
        user.hasGoogleAuth = true;
      }
      if (!user.avatar) user.avatar = avatar;
      await user.save();
    }

    // Generate token and send response (aligned with login/signup)
    return sendAuthResponse(res, user);
  } catch (error) {
    console.error("Error in Google login controller: ", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const logout = async (req, res) => {
  try {
    const { jwt: token } = req.cookies || {};
    clearCookie(res, "jwt");

    if (!token) {
      return res.status(200).json({ message: "Logged out successfully" });
    }

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    const statusCode = error.statusCode || 500;
    const message = statusCode >= 500 ? "Internal server error" : error.message;
    res.status(statusCode).json({ message });
  }
};
