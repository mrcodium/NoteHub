/**
 * linkGraph.service.js
 *
 * Responsibilities:
 *   1. extractInternalLinks(html)    — parse <a href> tags, return 3-part internal paths + http flag
 *   2. buildGraph(notes, onProgress) — crawl all notes, emit SSE progress, return graph data
 *
 * URL structure: https://notehub-official.vercel.app/{username}/{collectionSlug}/{noteSlug}
 *
 * noteSlug alone is NOT a unique identifier — it is only unique within a collectionId.
 * Two different users (or same user, different collections) can share the same noteSlug.
 * The composite key  "username/collectionSlug/noteSlug"  IS globally unique and maps 1:1 to a note._id.
 *
 * All graph edges are stored as ObjectId pairs. Slugs are snapshot-only display values.
 */

const PROD_ORIGIN = "https://notehub-official.vercel.app";

// Matches all href attribute values (single or double quotes)
const HREF_REGEX = /href=["']([^"']+)["']/gi;

// Matches plain http:// (not https://) — flags mixed-content links
const HTTP_ONLY_REGEX = /href=["']http:\/\//i;

/**
 * extractInternalLinks
 *
 * Parses all <a href> values from HTML and returns the internal ones as
 * 3-part composite paths: "username/collectionSlug/noteSlug".
 *
 * Only hrefs with exactly 3 path segments are accepted — anything shorter
 * (profile pages, collection pages, homepage) is not a note URL.
 *
 * @param {string} html
 * @returns {{ paths: string[], hasHttp: boolean }}
 *
 * Examples:
 *   "https://notehub-official.vercel.app/alice/ml/perceptrons"  → "alice/ml/perceptrons"
 *   "/bob/webdev/react-hooks"                                   → "bob/webdev/react-hooks"
 *   "/alice/ml"          — only 2 segments = collection page, skip
 *   "https://google.com" — external, skip
 */
export function extractInternalLinks(html) {
  if (!html) return { paths: [], hasHttp: false };

  const pathSet = new Set();
  let match;

  HREF_REGEX.lastIndex = 0;

  while ((match = HREF_REGEX.exec(html)) !== null) {
    const href = match[1].trim();
    let pathname = null;

    if (href.startsWith(PROD_ORIGIN)) {
      try {
        const url = new URL(href);
        pathname = url.pathname.replace(/^\//, "").replace(/\/$/, "");
      } catch {
        // malformed — skip
      }
    } else if (href.startsWith("/") && !href.startsWith("//")) {
      pathname = href.replace(/^\//, "").replace(/\/$/, "");
    }

    if (pathname) {
      const parts = pathname.split("/");
      // Exactly 3 parts = username/collectionSlug/noteSlug
      if (parts.length === 3) {
        pathSet.add(pathname);
      }
    }
  }

  const hasHttp = HTTP_ONLY_REGEX.test(html);
  return { paths: Array.from(pathSet), hasHttp };
}

/**
 * buildGraph
 *
 * Crawls every note, resolves internal links via the 3-part composite key,
 * and builds the full directed graph.
 *
 * @param {Array} notes — lean Note documents with populated userId.userName and collectionId.slug
 * @param {Function} onProgress — SSE callback, called once per note
 * @returns {{ edges, nodes, brokenLinks, summary }}
 */
export async function buildGraph(notes, onProgress) {
  // ── Step 1: build composite-path → noteId lookup ──────────────────────────
  // Key: "userName/collectionSlug/noteSlug"  →  ObjectId string
  const pathToId = new Map();
  const idToMeta = new Map(); // noteId → { slug, title, fullPath }

  for (const note of notes) {
    const id = note._id.toString();
    const userName = note.userId?.userName;
    const collectionSlug = note.collectionId?.slug;

    if (!userName || !collectionSlug) continue; // skip unpopulated (shouldn't happen)

    const fullPath = `${userName}/${collectionSlug}/${note.slug}`;
    pathToId.set(fullPath, id);
    idToMeta.set(id, { slug: note.slug, title: note.name, fullPath });
  }

  // ── Step 2: initialise per-node counters ──────────────────────────────────
  const outgoing   = new Map(); // noteId → Set<noteId>
  const incoming   = new Map(); // noteId → Set<noteId>
  const broken     = [];        // { from, fromSlug, href }
  const httpNotes  = new Set(); // noteIds containing http:// links

  for (const id of idToMeta.keys()) {
    outgoing.set(id, new Set());
    incoming.set(id, new Set());
  }

  const edges = [];
  const total = notes.length;

  // ── Step 3: crawl each note ───────────────────────────────────────────────
  for (let i = 0; i < notes.length; i++) {
    const note   = notes[i];
    const fromId = note._id.toString();

    if (!idToMeta.has(fromId)) {
      // Note was skipped in step 1 (missing population) — still emit progress
      onProgress({ type: "progress", current: i + 1, total, noteId: fromId, slug: note.slug, title: note.name });
      continue;
    }

    const { paths, hasHttp } = extractInternalLinks(note.content || "");

    if (hasHttp) httpNotes.add(fromId);

    for (const targetPath of paths) {
      const toId = pathToId.get(targetPath);

      if (!toId) {
        // Path did not resolve to any note → broken link
        broken.push({
          from: note._id,
          fromSlug: note.slug,
          href: `/${targetPath}`,
        });
        continue;
      }

      if (toId === fromId) continue; // self-link — ignore

      // Deduplicate: one edge per (from, to) pair
      if (!outgoing.get(fromId).has(toId)) {
        outgoing.get(fromId).add(toId);
        incoming.get(toId)?.add(fromId);

        edges.push({
          from: note._id,
          to: notes.find((n) => n._id.toString() === toId)._id,
          fromSlug: note.slug,
          toSlug: idToMeta.get(toId)?.slug,
        });
      }
    }

    onProgress({
      type: "progress",
      current: i + 1,
      total,
      noteId: fromId,
      slug: note.slug,
      title: note.name,
    });
  }

  // ── Step 4: build per-node analytics ─────────────────────────────────────
  const nodes = [];
  // Build a quick id→note lookup to avoid repeated .find()
  const noteById = new Map(notes.map((n) => [n._id.toString(), n]));

  for (const [id, meta] of idToMeta.entries()) {
    const out           = outgoing.get(id)?.size ?? 0;
    const inc           = incoming.get(id)?.size ?? 0;
    const hasBrokenLinks = broken.some((b) => b.from.toString() === id);

    nodes.push({
      noteId:         noteById.get(id)?._id,
      slug:           meta.slug,
      title:          meta.title,
      fullPath:       meta.fullPath,   // "username/collectionSlug/noteSlug" — use as /${fullPath} for navigation
      incomingCount:  inc,
      outgoingCount:  out,
      isOrphan:       inc === 0,
      isDeadEnd:      out === 0,
      isIsolated:     inc === 0 && out === 0,
      hasBrokenLinks,
      hasHttp:        httpNotes.has(id),
    });
  }

  // ── Step 5: summary ───────────────────────────────────────────────────────
  const summary = {
    totalNotes:      notes.length,
    totalEdges:      edges.length,
    orphanCount:     nodes.filter((n) => n.isOrphan).length,
    deadEndCount:    nodes.filter((n) => n.isDeadEnd).length,
    brokenLinkCount: broken.length,
    httpLinkCount:   httpNotes.size,
  };

  return { edges, nodes, brokenLinks: broken, summary };
}