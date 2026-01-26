import jwt from "jsonwebtoken";
import User from "../model/user.model.js";
import { ENV } from "../config/env.js";

/**
 * requester (soft auth)
 * - Attaches user to req.user if JWT is valid
 * - Never blocks the request
 */
export const requester = async (req, res, next) => {
  try {
    const token =
      req.cookies?.jwt ||
      req.headers.authorization?.split(" ")[1];

    if (!token) return next();

    let decoded;
    try {
      decoded = jwt.verify(token, ENV.JWT_SECRET, {
        algorithms: ["HS256"],
        issuer: ENV.JWT_ISSUER,
        audience: ENV.JWT_AUDIENCE,
      });
    } catch {
      return next(); // silent fail
    }

    const { userId } = decoded;
    if (!userId) return next();

    const user = await User.findById(userId).select("-password");
    if (user) {
      req.user = user; 
    }

    next();
  } catch (error) {
    console.error("Requester middleware error:", error);
    next(); // always continue
  }
};
