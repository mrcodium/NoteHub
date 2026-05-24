import Collection from "../model/collection.model.js";
import Note from "../model/note.model.js";
import User from "../model/user.model.js";
import { getCache, setCache, delCache } from "../services/cache.service.js";
import { htmlToMarkdown } from "../utils/htmlToMarkdown.js";
import { handleDbError } from "../utils/dbError.js";

const FALLBACK_SITE_URL = process.env.SITE_URL || "https://notehub-official.vercel.app";
const LLMS_TXT_CACHE_KEY = "llms:txt:template";
const LLMS_FULL_CACHE_KEY = "llms:full:template";
const CACHE_TTL_SEC = 60 * 60; // 1 hour

// Helper to resolve the site's base URL from request headers or query
function resolveSiteUrl(req) {
  const fromQuery = req.query.siteUrl;
  const fromOrigin = req.headers["origin"];
  let fromReferer = null;
  try {
    if (req.headers["referer"]) {
      fromReferer = new URL(req.headers["referer"]).origin;
    }
  } catch {
    // Ignore malformed referer
  }
  const candidate = fromQuery || fromOrigin || fromReferer || FALLBACK_SITE_URL;
  return candidate.replace(/\/$/, "");
}

function toDateString(date) {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
}

// ─── Build llms.txt template with __SITE_URL__ placeholder ──────────────────────────
async function buildLlmsTxtTemplate() {
  const P = "__SITE_URL__";

  // 1. Fetch data in parallel
  const [users, collections, notes] = await Promise.all([
    User.find({ isBanned: false, isDeleted: false })
      .select("_id fullName userName bio")
      .lean(),
    Collection.find({ visibility: "public" })
      .select("_id name slug userId")
      .lean(),
    Note.find({ visibility: "public" })
      .select("name slug collectionId userId seo.description")
      .lean(),
  ]);

  const userMap = new Map(users.map((u) => [u._id.toString(), u]));
  const collectionMap = new Map(collections.map((c) => [c._id.toString(), c]));

  // Group notes by collection
  const notesByCollection = new Map();
  for (const note of notes) {
    if (!collectionMap.has(note.collectionId.toString())) continue;
    const colId = note.collectionId.toString();
    if (!notesByCollection.has(colId)) {
      notesByCollection.set(colId, []);
    }
    notesByCollection.get(colId).push(note);
  }

  // Format Authors
  const authorsText = users
    .map((u) => `- [${u.fullName}](${P}/${u.userName}) (@${u.userName})${u.bio ? `: ${u.bio}` : ""}`)
    .join("\n");

  // Format Collections & Notes
  const collectionsText = collections
    .map((col) => {
      const author = userMap.get(col.userId.toString());
      if (!author) return "";
      const colNotes = notesByCollection.get(col._id.toString()) || [];
      const notesCount = colNotes.length;

      const notesFormatted = colNotes
        .map((note) => `- [${note.name}](${P}/${author.userName}/${col.slug}/${note.slug}): ${note.seo?.description || ""}`)
        .join("\n");

      return `### ${col.name} (by ${author.fullName}) — ${notesCount} note${notesCount === 1 ? "" : "s"}
${P}/${author.userName}/${col.slug}

${notesFormatted || "*No public notes inside this collection yet.*"}`;
    })
    .filter(Boolean)
    .join("\n\n");

  return `# NoteHub

> A collaborative blog and note publishing platform for developers and students. Covers frontend system design, DSA, algorithms, AI/ML, data science, React, Node.js, SQL, and DBMS. 140+ published notes by the developer community.

## About

NoteHub is a free platform where developers and students publish technical blogs, notes, and guides. Content is organized into collections by topic and author. The platform supports rich markdown, code blocks, LaTeX, and collaborative publishing.

- URL: ${P}
- Built by: Abhijeet Singh Rajput (@abhijeetsingh)
- Stack: Next.js, Node.js, MongoDB, React
- GitHub: https://github.com/abhijeetSinghRajput/notehub

## Platform Pages

- [Home](${P}/)
- [All Notes Index](${P}/index)
- [Privacy Policy](${P}/privacy-policy)

## Authors

${authorsText}

## Collections

${collectionsText}

## Optional

- [llms-full.txt](${P}/llms-full.txt)
`;
}

// ─── Build llms-full.txt template with __SITE_URL__ placeholder ──────────────────────
async function buildLlmsFullTxtTemplate() {
  const P = "__SITE_URL__";

  // 1. Fetch data in parallel
  const [users, collections, notes] = await Promise.all([
    User.find({ isBanned: false, isDeleted: false })
      .select("_id fullName userName")
      .lean(),
    Collection.find({ visibility: "public" })
      .select("_id name slug userId")
      .lean(),
    Note.find({ visibility: "public" })
      .select("name slug collectionId userId content contentUpdatedAt updatedAt")
      .lean(),
  ]);

  const userMap = new Map(users.map((u) => [u._id.toString(), u]));
  const collectionMap = new Map(collections.map((c) => [c._id.toString(), c]));

  // Create list index of notes
  const indexLines = [];
  const notesContentText = [];

  for (const note of notes) {
    const author = userMap.get(note.userId.toString());
    const col = collectionMap.get(note.collectionId.toString());
    if (!author || !col) continue;

    const noteUrl = `${P}/${author.userName}/${col.slug}/${note.slug}`;
    indexLines.push(`- [${note.name}](${noteUrl}) by ${author.fullName}`);

    const markdownBody = htmlToMarkdown(note.content);

    notesContentText.push(`---
# Note: ${note.name}
URL: ${noteUrl}
Author: ${author.fullName} (@${author.userName})
Collection: ${col.name}
Last Updated: ${toDateString(note.contentUpdatedAt || note.updatedAt)}

${markdownBody}
`);
  }

  return `# NoteHub - Full Technical Notes Corpus

> Dynamic all-in-one technical notes corpus compiled for Large Language Models. Contains all published technical notes in engineering, frontend design, algorithms, databases, AI/ML, and system architectures.

- Site URL: ${P}
- Generated on: ${new Date().toISOString()}

## Table of Contents

${indexLines.join("\n")}

${notesContentText.join("\n\n")}
`;
}

// ─── GET /llms.txt ───────────────────────────────────────────────────────────
export async function getLlmsTxt(req, res) {
  try {
    const siteUrl = resolveSiteUrl(req);
    let template = await getCache(LLMS_TXT_CACHE_KEY);

    if (!template) {
      template = await buildLlmsTxtTemplate();
      await setCache(LLMS_TXT_CACHE_KEY, template, CACHE_TTL_SEC);
    }

    const output = template.split("__SITE_URL__").join(siteUrl);

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", `public, max-age=${CACHE_TTL_SEC}`);
    return res.send(output);
  } catch (error) {
    console.error("❌ llms.txt generation failed:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
}

// ─── GET /llms-full.txt ──────────────────────────────────────────────────────
export async function getLlmsFullTxt(req, res) {
  try {
    const siteUrl = resolveSiteUrl(req);
    let template = await getCache(LLMS_FULL_CACHE_KEY);

    if (!template) {
      template = await buildLlmsFullTxtTemplate();
      await setCache(LLMS_FULL_CACHE_KEY, template, CACHE_TTL_SEC);
    }

    const output = template.split("__SITE_URL__").join(siteUrl);

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", `public, max-age=${CACHE_TTL_SEC}`);
    return res.send(output);
  } catch (error) {
    console.error("❌ llms-full.txt generation failed:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
}

// ─── DELETE /llms/cache (admin only / manual cache bust) ─────────────────────
export async function bustLlmsCache(req, res) {
  try {
    await delCache([LLMS_TXT_CACHE_KEY, LLMS_FULL_CACHE_KEY]);
    return res.status(200).json({
      success: true,
      message: "LLM routes cache successfully cleared.",
    });
  } catch (error) {
    console.error("❌ LLM cache bust failed:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
}
