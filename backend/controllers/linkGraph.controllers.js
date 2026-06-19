/**
 * linkGraph.controllers.js
 *
 * POST /api/admin/link-graph/crawl   — start a new crawl (SSE stream)
 * GET  /api/admin/link-graph/latest  — get the most recent completed crawl
 * GET  /api/admin/link-graph/history — list all crawl runs (id, status, summary, createdAt)
 */

import Note from "../models/note.model.js";
import LinkGraphCrawl from "../models/linkGraph.model.js";
import { buildGraph } from "../services/linkGraph.service.js";
import { handleDbError } from "../utils/dbError.js";
import { getPagination, paginationMeta } from "../utils/pagination.js";

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Send a single SSE event.
 * All events are JSON-encoded in the `data` field.
 * An optional `event` name allows the client to use addEventListener().
 */
function sendSSE(res, eventName, payload) {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

// ─── POST /api/admin/link-graph/crawl ─────────────────────────────────────────

export const startCrawl = async (req, res) => {
  // ── 1. SSE handshake ────────────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering if present
  res.flushHeaders();

  // Keep-alive ping every 15s to prevent proxy timeouts
  const keepAlive = setInterval(() => {
    res.write(": ping\n\n");
  }, 15_000);

  const cleanup = () => clearInterval(keepAlive);
  req.on("close", cleanup);

  // ── 2. Create a pending crawl document ─────────────────────────────────────
  let crawl;
  try {
    crawl = await LinkGraphCrawl.create({
      status: "running",
      triggeredBy: req.user._id,
    });
  } catch (err) {
    cleanup();
    sendSSE(res, "error", { message: "Failed to initialise crawl record." });
    return res.end();
  }

  sendSSE(res, "start", {
    crawlId: crawl._id,
    message: "Crawl started",
    startedAt: crawl.createdAt,
  });

  // ── 3. Load all notes — populate userId.userName + collectionId.slug ──────────
  // The composite key "userName/collectionSlug/noteSlug" is globally unique
  // and matches the frontend URL. noteSlug alone is NOT unique across users/collections.
  let notes;
  try {
    notes = await Note.find({}, "_id slug name content userId collectionId")
      .populate("userId", "userName")
      .populate("collectionId", "slug")
      .lean();
  } catch (err) {
    crawl.status = "failed";
    crawl.errorMessage = "Failed to load notes from database.";
    await crawl.save().catch(() => {});

    cleanup();
    sendSSE(res, "error", { message: crawl.errorMessage });
    return res.end();
  }

  sendSSE(res, "info", {
    message: `Loaded ${notes.length} notes. Beginning link extraction…`,
    totalNotes: notes.length,
  });

  // ── 4. Build graph with progress callbacks ───────────────────────────────────
  try {
    const { edges, nodes, brokenLinks, summary } = await buildGraph(
      notes,
      (progressEvent) => {
        // Called once per note — streams live progress to the admin
        sendSSE(res, "progress", progressEvent);
      },
    );

    // ── 5. Persist completed crawl ─────────────────────────────────────────────
    crawl.edges = edges;
    crawl.nodes = nodes;
    crawl.brokenLinks = brokenLinks;
    crawl.summary = summary;
    crawl.status = "completed";
    crawl.completedAt = new Date();
    await crawl.save();

    // ── 6. Emit final done event ───────────────────────────────────────────────
    sendSSE(res, "done", {
      crawlId: crawl._id,
      summary,
      completedAt: crawl.completedAt,
    });
  } catch (err) {
    console.error("Error in linkGraph.startCrawl:", err);

    try {
      crawl.status = "failed";
      crawl.errorMessage = err.message || "Unknown error during crawl.";
      await crawl.save();
    } catch (_) {}

    sendSSE(res, "error", {
      message: "Crawl failed unexpectedly.",
      detail: err.message,
    });
  } finally {
    cleanup();
    res.end();
  }
};

// ─── GET /api/admin/link-graph/latest ─────────────────────────────────────────

export const getLatestCrawl = async (req, res) => {
  try {
    const crawl = await LinkGraphCrawl.findOne({ status: "completed" })
      .sort({ createdAt: -1 })
      .lean();

    if (!crawl) {
      return res.status(404).json({
        success: false,
        message: "No completed crawl found. Run a crawl first.",
      });
    }

    return res.status(200).json({ success: true, crawl });
  } catch (error) {
    console.error("Error in linkGraph.getLatestCrawl:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

// ─── GET /api/admin/link-graph/history ────────────────────────────────────────
export const getCrawlHistory = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const [history, total] = await Promise.all([
      LinkGraphCrawl.find(
        {},
        "_id status summary createdAt completedAt triggeredBy errorMessage",
      )
        .populate("triggeredBy", "userName fullName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LinkGraphCrawl.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      history,
      pagination: paginationMeta(total, page, limit),
    });
  } catch (error) {
    console.error("Error in linkGraph.getCrawlHistory:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};