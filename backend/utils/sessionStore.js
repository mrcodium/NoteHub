import redisClient from "../config/redis.js";
import Session from "../model/session.model.js";
import { ENV } from "../config/env.js";

const SESSION_PREFIX = "session";
const USER_SESSIONS_PREFIX = "user_sessions";

export const createSession = async ({
  userId,
  sessionId,
  refreshTokenHash,
  deviceName,
  ip,
  location,
}) => {
  const expiresAt = new Date(
    Date.now() + ENV.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );
  
  const sessionData = {
    userId: userId.toString(),
    sessionId,
    refreshTokenHash,
    deviceName,
    ip,
    location,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  // 1. Save to Redis
  const sessionKey = `${SESSION_PREFIX}:${userId}:${sessionId}`;
  const userSessionsKey = `${USER_SESSIONS_PREFIX}:${userId}`;
  const ttlSeconds = ENV.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60;

  await redisClient.setEx(sessionKey, ttlSeconds, JSON.stringify(sessionData));
  await redisClient.sAdd(userSessionsKey, sessionId);

  // 2. Save to Mongo (for persistence across Redis flushes)
  await Session.create({
    userId,
    sessionId,
    refreshTokenHash,
    deviceName,
    ip,
    location,
    expiresAt,
    lastActiveAt: new Date(),
  });

  return sessionData;
};

export const getSession = async (userId, sessionId) => {
  const sessionKey = `${SESSION_PREFIX}:${userId}:${sessionId}`;
  const data = await redisClient.get(sessionKey);
  
  if (data) {
    return JSON.parse(data);
  }
  
  // If not in Redis, try MongoDB (in case Redis was flushed)
  const mongoSession = await Session.findOne({ sessionId, userId });
  if (mongoSession) {
    const sessionData = {
      userId: mongoSession.userId.toString(),
      sessionId: mongoSession.sessionId,
      refreshTokenHash: mongoSession.refreshTokenHash,
      deviceName: mongoSession.deviceName,
      ip: mongoSession.ip,
      location: mongoSession.location,
      createdAt: mongoSession.createdAt.toISOString(),
      lastActiveAt: mongoSession.lastActiveAt.toISOString(),
      expiresAt: mongoSession.expiresAt.toISOString(),
    };
    
    // Restore to Redis
    const ttlSeconds = Math.max(
      1,
      Math.floor((new Date(mongoSession.expiresAt).getTime() - Date.now()) / 1000)
    );
    await redisClient.setEx(sessionKey, ttlSeconds, JSON.stringify(sessionData));
    await redisClient.sAdd(`${USER_SESSIONS_PREFIX}:${userId}`, sessionId);
    
    return sessionData;
  }

  return null;
};

export const updateLastActive = async (userId, sessionId) => {
  // Issue 10A fixed: throttle to at most once per 5 minutes per session.
  // Without this, every authenticated API call causes a Redis read + write,
  // which can become a bottleneck under high traffic.
  const throttleKey = `lastActive_throttle:${userId}:${sessionId}`;
  const alreadyUpdated = await redisClient.exists(throttleKey);
  if (alreadyUpdated) return;

  // Set a 5-minute TTL flag before doing the actual update
  await redisClient.setEx(throttleKey, 300, "1");

  const sessionData = await getSession(userId, sessionId);
  if (sessionData) {
    sessionData.lastActiveAt = new Date().toISOString();
    const sessionKey = `${SESSION_PREFIX}:${userId}:${sessionId}`;
    // Keep the current TTL
    const ttl = await redisClient.ttl(sessionKey);
    if (ttl > 0) {
      await redisClient.setEx(sessionKey, ttl, JSON.stringify(sessionData));
    }

    // Update Mongo without waiting
    Session.updateOne({ sessionId }, { lastActiveAt: new Date() }).exec();
  }
};

export const deleteSession = async (userId, sessionId) => {
  const sessionKey = `${SESSION_PREFIX}:${userId}:${sessionId}`;
  const userSessionsKey = `${USER_SESSIONS_PREFIX}:${userId}`;
  
  await redisClient.del(sessionKey);
  await redisClient.sRem(userSessionsKey, sessionId);
  await Session.deleteOne({ sessionId, userId });
};

export const deleteAllUserSessions = async (userId) => {
  const userSessionsKey = `${USER_SESSIONS_PREFIX}:${userId}`;
  const sessionIds = await redisClient.sMembers(userSessionsKey);
  
  if (sessionIds && sessionIds.length > 0) {
    const keysToDelete = sessionIds.map(id => `${SESSION_PREFIX}:${userId}:${id}`);
    await redisClient.del([...keysToDelete, userSessionsKey]);
  }
  
  await Session.deleteMany({ userId });
};

export const deleteAllSessionsExcept = async (userId, currentSessionId) => {
  const userSessionsKey = `${USER_SESSIONS_PREFIX}:${userId}`;
  const sessionIds = await redisClient.sMembers(userSessionsKey);
  
  const idsToDelete = sessionIds.filter(id => id !== currentSessionId);
  if (idsToDelete.length > 0) {
    const keysToDelete = idsToDelete.map(id => `${SESSION_PREFIX}:${userId}:${id}`);
    await redisClient.del(keysToDelete);
    await redisClient.sRem(userSessionsKey, idsToDelete);
    await Session.deleteMany({ userId, sessionId: { $in: idsToDelete } });
  }
};

export const getUserSessions = async (userId) => {
  const userSessionsKey = `${USER_SESSIONS_PREFIX}:${userId}`;
  const sessionIds = await redisClient.sMembers(userSessionsKey);
  
  if (!sessionIds || sessionIds.length === 0) {
    // Try mongo in case Redis is empty but mongo isn't
    const mongoSessions = await Session.find({ userId });
    if (mongoSessions.length > 0) {
      return mongoSessions.map(s => ({
        sessionId: s.sessionId,
        deviceName: s.deviceName,
        ip: s.ip,
        location: s.location,
        createdAt: s.createdAt,
        lastActiveAt: s.lastActiveAt,
      }));
    }
    return [];
  }
  
  const sessions = [];
  const expiredIds = [];
  
  for (const id of sessionIds) {
    const data = await redisClient.get(`${SESSION_PREFIX}:${userId}:${id}`);
    if (data) {
      sessions.push(JSON.parse(data));
    } else {
      expiredIds.push(id);
    }
  }
  
  // Clean up expired ones from the set
  if (expiredIds.length > 0) {
    await redisClient.sRem(userSessionsKey, expiredIds);
  }
  
  return sessions;
};
