import { config } from "dotenv";
import express from "express";
import connectToDb from "./utils/connectToDb.js";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRoutes from "./routers/auth.routes.js";
import userRoutes from "./routers/user.routes.js";
import passwordRoutes from "./routers/password.routes.js";
import collectionRoutes from "./routers/collection.routes.js";
import noteRoutes from "./routers/note.routes.js";
import ImageRoutes from "./routers/Image.routes.js";
import searchRoutes from "./routers/search.routes.js";
import sitemapRoutes from "./routers/sitemap.routes.js"

import "./model/Image.model.js";
import path from "path";
import { ENV } from "./config/env.js";
import { connectRedis } from "./config/redis.js";

config();
const PORT = ENV.PORT;
const __dirname = path.resolve();

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:5173", // react port
      "http://localhost:5174", // react port fallback 1
      "http://localhost:5175", // react port fallback 2

      "http://localhost:3000", // for next.js dev
      "https://notehub-official.vercel.app", // for next.js prod
    ],
    credentials: true,
  }),
);

//ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/password", passwordRoutes);
app.use("/api/collection", collectionRoutes);
app.use("/api/note", noteRoutes);
app.use("/api/images", ImageRoutes);
app.use("/", sitemapRoutes);

// Serve frontend in production
if (ENV.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

app.get("/api/health", async (req, res) => {
  try {
    // Check DB connection
    let dbStatus = "❌disconnected";
    if (global.mongoose && global.mongoose.connection.readyState === 1) {
      dbStatus = "✅connected";
    }

    // Check Redis connection
    let redisStatus = "❌disconnected";
    if (global.redisClient && global.redisClient.isOpen) {
      redisStatus = "✅connected";
    }

    res.status(200).json({
      status: "OK",
      message: "Server is running 🚀",
      environment: ENV.NODE_ENV,
      port: PORT,
      health: {
        database: dbStatus,
        redis: redisStatus,
      },
      routes: {
        auth: "/api/auth",
        user: "/api/user",
        search: "/api/search",
        password: "/api/password",
        collection: "/api/collection",
        note: "/api/note",
        images: "/api/images",
      },
      info: {
        version: "1.0.0",
        description:
          "Backend API for notes, collections, authentication, and search.",
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      message: "Health check failed",
      error: error.message,
    });
  }
});

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await connectToDb();
  await connectRedis();
});
