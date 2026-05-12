import User from "../model/user.model.js";
import { verifyToken } from "../utils/jwt.js";
import { updateLastActive } from "../utils/sessionStore.js";

export const protectRoute = async (req, res, next) => {
  try {
    const accessToken =
      req.cookies?.accessToken ||
      req.headers.authorization?.split(" ")[1];

    if (!accessToken) {
      // Clear legacy jwt cookie if it exists to clean up state
      if (req.cookies?.jwt) {
        res.clearCookie("jwt");
      }
      return res.status(401).json({
        message: "Authentication required, access token missing",
        code: "AUTH_REQUIRED",
      });
    }

    let decoded;
    try {
      decoded = verifyToken(accessToken);
    } catch (error) {
      return res.status(401).json({
        message: "Invalid or expired token",
        code: error.name || "INVALID_TOKEN",
      });
    }

    const { userId, sessionId } = decoded;

    if (!userId || !sessionId) {
      return res.status(401).json({
        message: "Invalid token payload",
        code: "INVALID_PAYLOAD",
      });
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Attach user and sessionId
    req.user = user;
    req.sessionId = sessionId;

    // Optional: update lastActiveAt asynchronously
    updateLastActive(userId, sessionId).catch(console.error);

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.clearCookie("accessToken");

    res.status(500).json({
      message: "Authentication failed",
      code: "AUTH_ERROR",
    });
  }
};

export const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      message: "Access denied. Admin privileges required.",
      code: "ADMIN_REQUIRED",
    });
  }
  next();
};

