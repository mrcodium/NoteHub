import IORedis from "ioredis";
import { ENV } from "./env.js";

export const bullRedis = new IORedis({
  host: ENV.REDIS_HOST,
  port: Number(ENV.REDIS_PORT),
  password: ENV.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // required for BullMQ
  enableReadyCheck: false,
});

bullRedis.on("connect", () => console.log("✅ BullMQ Redis connected"));
bullRedis.on("error", (err) => console.error("❌ BullMQ Redis error:", err.message));