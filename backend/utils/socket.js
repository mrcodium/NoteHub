// utils/socket.js
import { Server } from "socket.io";

let io = null;

export function initIO(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "https://notehub-official.vercel.app",
      ],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.on("join:campaign", (campaignId) => {
      socket.join(campaignId);
    });
    socket.on("leave:campaign", (campaignId) => {
      socket.leave(campaignId);
    });
  });

  return io;
}

export function getIO() {
  return io;
}