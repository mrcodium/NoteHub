import jwt from "jsonwebtoken";
import User from "../model/user.model.js";
import { ENV } from "../config/env.js";

export const protectRoute = async (req, res, next) => {
  try {
    const token =
      req.cookies?.jwt ||
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, ENV.JWT_SECRET, {
        algorithms: ["HS256"],
        issuer: ENV.JWT_ISSUER,
        audience: ENV.JWT_AUDIENCE,
      });
    } catch (err) {
      return res.status(401).json({
        message: "Invalid or expired token",
        code: err.name || "INVALID_TOKEN",
      });
    }

    const { userId } = decoded;

    if (!userId) {
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

    // ✅ Attach user only
    req.user = user;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.clearCookie("jwt");

    res.status(500).json({
      message: "Authentication failed",
      code: "AUTH_ERROR",
    });
  }
};
