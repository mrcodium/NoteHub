import jwt from "jsonwebtoken";
import User from "../model/user.model.js";
import LoginRecord from "../model/loginRecord.model.js";
import { Types } from "mongoose";

/**
 * user extraction (no auth enforcement)
 * - Attaches user to `req.user` if valid token exists
 * - Silently fails if token is missing/invalid
 */
export const requester = async (req, res, next) => {
  try {
    const token = req.cookies?.jwt || req.headers.authorization?.split(" ")[1];
    if (!token) return next(); 

    // Verify token (but don't reject on error)
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ["HS256"],
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
      });
    } catch {
      return next(); 
    }

    // Validate session ID format
    const { sessionId } = decoded;
    if (!sessionId || !Types.ObjectId.isValid(sessionId)) {
      return next();
    }

    // Check session (silently skip if invalid)
    const session = await LoginRecord.findOne({
      _id: new Types.ObjectId(sessionId),
      isRevoked: false,
      tokenExpiry: { $gt: new Date() },
    });
    if (!session) return next();

    // Attach user if everything checks out
    const user = await User.findById(session.userId);
    if (user) {
      req.user = user;
      req.session = session; // Optional: attach session data
    }

    next();
  } catch (error) {
    console.error("User extraction error:", error);
    next(); // Always continue even on errors
  }
};