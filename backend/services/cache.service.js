import redisClient from "../config/redis.js";

export const getCache = async (key) => {
  try {
    return await redisClient.get(key);
  } catch {
    return null;
  }
};

export const setCache = async (key, value, ttl = 300) => {
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
  } catch {}
};

export const delCache = async (keys) => {
  try {
    if (Array.isArray(keys)) await redisClient.del(...keys);
    else await redisClient.del(keys);
  } catch {}
};
