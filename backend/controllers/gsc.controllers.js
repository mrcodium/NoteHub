import {
  getOAuthClient,
  getSearchConsoleService,
  SCOPES,
  SITE_URL,
} from "../config/gsc.client.js";
import redis from "../config/redis.js";
import Note from "../models/note.model.js";

export const GSC_LAST_SYNCED_KEY = "gsc:last_synced";

// ─── GSC OAuth: redirect to Google ───────────────────────────────────────────
export const gscAuth = (req, res) => {
  const oauth2Client = getOAuthClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
  return res.redirect(url);
};

// ─── GSC OAuth: callback ──────────────────────────────────────────────────────
export const gscCallback = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code)
      return res.status(400).json({ success: false, message: "Missing code." });

    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    await redis.set("gsc:tokens", JSON.stringify(tokens));

    // Immediately sync on first connect
    await _syncIndexedUrls();

    return res.status(200).json({
      success: true,
      message: "GSC connected and synced.",
    });
  } catch (error) {
    console.error("Error in gscCallback:", error);
    return res
      .status(500)
      .json({ success: false, message: "GSC connection failed." });
  }
};

// ─── Internal sync function ───────────────────────────────────────────────────
const _syncIndexedUrls = async () => {
  const sc = await getSearchConsoleService();

  // Step 1: fetch all indexed paths from GSC
  const indexedPaths = new Set();
  let startRow = 0;
  const rowLimit = 25000;

  while (true) {
    const response = await sc.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate: "2020-01-01",
        endDate: new Date().toISOString().split("T")[0],
        dimensions: ["page"],
        rowLimit,
        startRow,
      },
    });

    const rows = response.data.rows || [];
    for (const row of rows) {
      const url = new URL(row.keys[0]);
      indexedPaths.add(url.pathname); // e.g. /abhijeet/daa/mst-kruskals
    }

    if (rows.length < rowLimit) break;
    startRow += rowLimit;
  }

  // Step 2: fetch all notes with their full path info
  const notes = await Note.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "collections",
        localField: "collectionId",
        foreignField: "_id",
        as: "collection",
      },
    },
    { $unwind: { path: "$collection", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        userName: "$user.userName",
        collectionSlug: "$collection.slug",
        noteSlug: "$slug",
      },
    },
  ]);

  // Step 3: bulkWrite isIndexed + lastSynced to every note
  const now = new Date();
  const bulkOps = notes.map((note) => {
    const path = `/${note.userName}/${note.collectionSlug}/${note.noteSlug}`;
    return {
      updateOne: {
        filter: { _id: note._id },
        update: {
          $set: {
            "gsc.isIndexed": indexedPaths.has(path),
            "gsc.lastSynced": now,
          },
        },
      },
    };
  });

  if (bulkOps.length > 0) {
    await Note.bulkWrite(bulkOps, { ordered: false });
  }

  // Step 4: save last synced timestamp to Redis for status display
  await redis.set(GSC_LAST_SYNCED_KEY, now.toISOString());

  return { totalNotes: notes.length, indexedCount: indexedPaths.size };
};

// ─── GSC Sync route handler ───────────────────────────────────────────────────
export const gscSync = async (req, res) => {
  try {
    const { totalNotes, indexedCount } = await _syncIndexedUrls();
    const lastSynced = await redis.get(GSC_LAST_SYNCED_KEY);

    return res.status(200).json({
      success: true,
      message: `Synced ${indexedCount} indexed URLs across ${totalNotes} notes.`,
      lastSynced,
      indexedCount,
      totalNotes,
    });
  } catch (error) {
    console.error("Error in gscSync:", error);
    if (error.status === 401) {
      return res.status(401).json({
        success: false,
        message: "GSC not connected. Visit /api/admin/gsc/auth",
      });
    }
    return res
      .status(500)
      .json({ success: false, message: "GSC sync failed." });
  }
};

// ─── GSC Status ───────────────────────────────────────────────────────────────
export const gscStatus = async (req, res) => {
  try {
    const tokens     = await redis.get("gsc:tokens");
    const lastSynced = await redis.get(GSC_LAST_SYNCED_KEY);

    return res.status(200).json({
      success:   true,
      connected: !!tokens,
      lastSynced: lastSynced || null,
    });
  } catch (error) {
    console.error("Error in gscStatus:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get GSC status." });
  }
};