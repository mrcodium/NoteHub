// utils/socket.js
import { Server } from "socket.io";
import Campaign from "../model/campaign.model.js";

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

    // Sync snapshot for late joiners (e.g. resend duplicate campaign)
    socket.on("campaign:sync", async (campaignId) => {
      const campaign =
        await Campaign.findById(campaignId).select("stats status");
      if (!campaign) return;

      socket.emit("campaign:progress", { stats: campaign.stats });

      if (campaign.status === "done" || campaign.status === "failed") {
        socket.emit("campaign:done", {
          stats: campaign.stats,
          status: campaign.status,
        });
      }
    });
  });

  return io;
}

export function getIO() {
  return io;
}
