import jwt from "jsonwebtoken";
import User from "../model/user.model.js";
import { ENV } from "../config/env.js";

// Socket.IO JWT auth middleware
const socketAuthMiddleware = async (socket, next) => {
  try {
    const authHeader = socket.handshake.headers.authorization;
    const cookieHeader = socket.handshake.headers.cookie;

    // 1️⃣ Extract token
    let token;

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split("; ").map(c => c.split("="))
      );
      token = cookies.jwt;
    }

    if (!token) {
      return next(new Error("Authentication required"));
    }

    // 2️⃣ Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, ENV.JWT_SECRET, {
        algorithms: ["HS256"],
        issuer: ENV.JWT_ISSUER,
        audience: ENV.JWT_AUDIENCE,
      });
    } catch (err) {
      return next(new Error("Invalid or expired token"));
    }

    const { userId } = decoded;
    if (!userId) {
      return next(new Error("Invalid token payload"));
    }

    // 3️⃣ Fetch user
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return next(new Error("User not found"));
    }

    // 4️⃣ Attach user to socket
    socket.user = user;

    next();
  } catch (err) {
    console.error("Socket auth error:", err);
    next(new Error("Unauthorized"));
  }
};

export default socketAuthMiddleware;
