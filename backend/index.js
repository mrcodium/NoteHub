import { config } from "dotenv";
import express from "express";
import connectToDb from "./utils/connectToDb.js";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRoutes from "./routers/auth.router.js";
import userRoutes from "./routers/user.router.js";
import passwordRoutes from "./routers/password.router.js";
import collectionRoutes from "./routers/collection.router.js";
import noteRoutes from "./routers/note.router.js";
import ImageRoutes from "./routers/Image.router.js";
import searchRoutes from "./routers/search.router.js";
import { app, server } from "./libs/socketio.js";

import "./model/Image.model.js";
import path from "path";

config();
const PORT = process.env.PORT;
const __dirname = path.resolve();

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
    ],
    credentials: true,
  })
);

// app.get("/", (req, res) => {
//   res.status(200).json({ message: "hello from the server." });
// });

//ROUTES
app.use("/api/auth",         authRoutes);
app.use("/api/user",         userRoutes);
app.use("/api/search",       searchRoutes);
app.use("/api/password",     passwordRoutes);
app.use("/api/collection",   collectionRoutes);
app.use("/api/note",         noteRoutes);
app.use("/api/images",       ImageRoutes);

if(process.env.NODE_ENV === "production"){
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res)=>{
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  })
}

server.listen(PORT, () => {
  console.log(`running on http://localhost:${PORT}`);
  connectToDb();
});
