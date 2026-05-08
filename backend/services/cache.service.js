import redisClient from "../config/redis.js";

const CACHE_VERSION = "v1";

// Centralized cache key generator
export const cacheKeys = {
  note: {
    byId: (id, userId = "guest") => `${CACHE_VERSION}:note:id:${id}:user:${userId}`,
    bySlug: (username, collectionSlug, noteSlug, userId = "guest") =>
      `${CACHE_VERSION}:note:slug:${username}:${collectionSlug}:${noteSlug}:user:${userId}`,
    allUserSlugs: (username, collectionSlug, noteSlug) =>
      `${CACHE_VERSION}:note:slug:${username}:${collectionSlug}:${noteSlug}:user:*`,
    allInCollection: (username, collectionSlug) =>
      `${CACHE_VERSION}:note:slug:${username}:${collectionSlug}:*:user:*`,
  },
  collection: {
    bySlug: (username, collectionSlug, userId = "guest") =>
      `${CACHE_VERSION}:collection:slug:${username}:${collectionSlug}:user:${userId}`,
    allUserSlugs: (username, collectionSlug) =>
      `${CACHE_VERSION}:collection:slug:${username}:${collectionSlug}:user:*`,
  },
  feed: {
    public: (page, limit, userId = "guest") =>
      `${CACHE_VERSION}:public:notes:page:${page}:limit:${limit}:user:${userId}`,
    allPublic: () => `${CACHE_VERSION}:public:notes:*`,
  },
  search: {
    query: (userId, queryKey, page, limit) =>
      `${CACHE_VERSION}:search:${userId}:q:${queryKey}:p:${page}:l:${limit}`,
    all: () => `${CACHE_VERSION}:search:*`,
  },
};

// Logging wrapper
const logCache = (action, key, extra = "") => {
  // console.log(`[CACHE ${action}] ${key} ${extra}`); // Optional debug logging
};

export const getCache = async (key) => {
  try {
    const startTime = Date.now();
    const data = await redisClient.get(key);
    const duration = Date.now() - startTime;
    if (data) {
      logCache("HIT", key, `(${duration}ms)`);
    } else {
      logCache("MISS", key, `(${duration}ms)`);
    }
    return data;
  } catch (err) {
    console.error(`[CACHE ERROR] getCache ${key}:`, err.message);
    return null;
  }
};

const getJitteredTTL = (ttl) => {
  // Add +/- 10% jitter to prevent stampedes of keys expiring at the same exact time
  const jitter = Math.floor(ttl * 0.1);
  return ttl + Math.floor(Math.random() * (jitter * 2 + 1)) - jitter;
};

export const setCache = async (key, value, ttl = 300) => {
  try {
    const finalTTL = getJitteredTTL(ttl);
    const startTime = Date.now();
    await redisClient.setEx(key, finalTTL, typeof value === "string" ? value : JSON.stringify(value));
    const duration = Date.now() - startTime;
    logCache("SET", key, `TTL:${finalTTL} (${duration}ms)`);
  } catch (err) {
    console.error(`[CACHE ERROR] setCache ${key}:`, err.message);
  }
};

// In-memory lock for single-flight requests
const inFlightRequests = new Map();

/**
 * Single-flight caching wrapper.
 * Prevents cache stampedes by ensuring only one DB request is fired for concurrent requests on the same key.
 */
export const fetchWithCache = async (key, fetcherFn, ttl = 300) => {
  // 1. Check Cache
  const cached = await getCache(key);
  if (cached) {
    try {
      return { data: JSON.parse(cached), cache: true };
    } catch {
      return { data: cached, cache: true };
    }
  }

  // 2. Single-flight locking
  if (inFlightRequests.has(key)) {
    logCache("WAITING_ON_FLIGHT", key);
    const result = await inFlightRequests.get(key);
    return { data: result, cache: true };
  }

  // 3. Create flight promise
  const flightPromise = fetcherFn().then(async (result) => {
    // Only cache if result is valid (not null/undefined)
    if (result !== null && result !== undefined) {
      await setCache(key, result, ttl);
    }
    return result;
  }).catch((err) => {
    // Make sure to reject so waiters know it failed
    inFlightRequests.delete(key);
    throw err;
  });

  inFlightRequests.set(key, flightPromise);

  try {
    const result = await flightPromise;
    inFlightRequests.delete(key);
    return { data: result, cache: false };
  } catch (err) {
    inFlightRequests.delete(key);
    throw err;
  }
};

export const delCache = async (keys) => {
  try {
    if (Array.isArray(keys)) {
      if (keys.length > 0) {
        await redisClient.del(keys);
        logCache("DEL", keys.join(", "));
      }
    } else if (keys) {
      await redisClient.del(keys);
      logCache("DEL", keys);
    }
  } catch (err) {
    console.error(`[CACHE ERROR] delCache ${keys}:`, err.message);
  }
};

// Safe pattern-based deletion using SCAN + PIPELINE
export const delCacheByPattern = async (pattern) => {
  try {
    let cursor = 0;
    let deletedCount = 0;
    const startTime = Date.now();
    
    do {
      const result = await redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: 200,
      });
      cursor = result.cursor;
      const keys = result.keys;

      if (keys.length > 0) {
        const pipeline = redisClient.multi();
        keys.forEach((key) => pipeline.del(key));
        await pipeline.exec();
        deletedCount += keys.length;
      }
    } while (cursor !== 0);
    
    const duration = Date.now() - startTime;
    if (deletedCount > 0) {
      logCache("DEL_PATTERN", pattern, `(Deleted ${deletedCount} keys in ${duration}ms)`);
    }
  } catch (err) {
    console.error(`[CACHE ERROR] delCacheByPattern ${pattern}:`, err.message);
  }
};

// Centralized Cache Invalidation Helpers

export const invalidatePublicFeeds = async () => {
  await delCacheByPattern(cacheKeys.feed.allPublic());
};

export const invalidateSearchFeeds = async () => {
  await delCacheByPattern(cacheKeys.search.all());
};

export const invalidateCollectionCache = async (username, collectionSlug) => {
  const promises = [];
  if (username && collectionSlug) {
    promises.push(delCacheByPattern(cacheKeys.collection.allUserSlugs(username, collectionSlug)));
    promises.push(delCacheByPattern(cacheKeys.note.allInCollection(username, collectionSlug)));
  }
  await Promise.all(promises);
};

export const invalidateNoteCache = async (noteId, username, collectionSlug, noteSlug) => {
  const promises = [];
  if (noteId) {
    promises.push(delCacheByPattern(`${CACHE_VERSION}:note:id:${noteId}:user:*`));
  }
  if (username && collectionSlug && noteSlug) {
    promises.push(delCacheByPattern(cacheKeys.note.allUserSlugs(username, collectionSlug, noteSlug)));
  }
  await Promise.all(promises);
};

export const invalidateFeedsAndSearch = async () => {
  await Promise.all([
    invalidatePublicFeeds(),
    invalidateSearchFeeds()
  ]);
};
