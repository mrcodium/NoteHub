import User from "../model/user.model.js";
import { verifyToken } from "../utils/jwt.js";

/**
 * requester (soft auth)
 * - Attaches user to req.user if JWT is valid
 * - Never blocks the request
 */
export const requester = async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.headers.authorization?.split(" ")[1];

    if (!token) return next();

    let decoded;
    try {
      decoded = verifyToken(token);
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
