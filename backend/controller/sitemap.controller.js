import Collection from "../model/collection.model.js";
import Note from "../model/note.model.js";
import User from "../model/user.model.js";
import { getCache, setCache, delCache } from "../services/cache.service.js";

const FALLBACK_SITE_URL =
  process.env.SITE_URL || "https://notehub-38kp.onrender.com";
const SITEMAP_CACHE_KEY = "sitemap:template";
const CACHE_TTL_SEC = 60 * 60; // 1 hour

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveSiteUrl(req) {
  const fromQuery = req.query.siteUrl;
  const fromOrigin = req.headers["origin"];

  // Safely parse referer — new URL() throws on malformed input
  let fromReferer = null;
  try {
    if (req.headers["referer"]) {
      fromReferer = new URL(req.headers["referer"]).origin;
    }
  } catch {
    // malformed referer — ignore
  }

  const candidate = fromQuery || fromOrigin || fromReferer || FALLBACK_SITE_URL;
  return candidate.replace(/\/$/, "");
}

function buildUrl(
  siteUrl,
  path,
  lastmod,
  changefreq = "weekly",
  priority = "0.5",
) {
  return `
  <url>
    <loc>${siteUrl}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

function toDateString(date) {
  return new Date(date).toISOString().split("T")[0];
}
async function getTemplateFromCache() {
  const raw = await getCache(SITEMAP_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "string" ? parsed : null;
  } catch {
    return null; // corrupted cache entry — treat as a miss
  }
}

async function saveTemplateToCache(template) {
  // Pass the plain string; setCache will JSON.stringify it before storing.
  await setCache(SITEMAP_CACHE_KEY, template, CACHE_TTL_SEC);
}

// ─── Build template with __SITE_URL__ placeholder ─────────────────────────────

async function buildSitemapTemplate() {
  const P = "__SITE_URL__";

  /* USERS */
  const users = await User.find({}).select("_id userName updatedAt").lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u.userName]));

  const userUrls = users.map((u) =>
    buildUrl(
      P,
      `/${u.userName}`,
      toDateString(u.updatedAt),
      "weekly",
      "0.6",
    ),
  );

  /* COLLECTIONS */
  const collections = await Collection.find({ visibility: "public" })
    .select("_id slug userId updatedAt")
    .lean();

  const collectionMap = new Map(
    collections.map((c) => [c._id.toString(), c.slug]),
  );

  const collectionUrls = collections
    .map((col) => {
      const userName = userMap.get(col.userId.toString());
      if (!userName || !col.slug) return null;
      return buildUrl(
        P,
        `/${userName}/${col.slug}`,
        toDateString(col.updatedAt),
        "weekly",
        "0.7",
      );
    })
    .filter(Boolean);

  /* NOTES — only query if there are public collections to avoid a vacuous $in [] */
  const noteUrls = [];
  if (collections.length > 0) {
    const notes = await Note.find({
      visibility: "public",
      collectionId: { $in: collections.map((c) => c._id) },
    })
      .select("_id slug collectionId userId updatedAt contentUpdatedAt")
      .lean();

    for (const note of notes) {
      const userName = userMap.get(note.userId.toString());
      const collectionSlug = collectionMap.get(note.collectionId.toString());
      if (!userName || !collectionSlug || !note.slug) continue;
      noteUrls.push(
        buildUrl(
          P,
          `/${userName}/${collectionSlug}/${note.slug}`,
          toDateString(note.contentUpdatedAt || note.updatedAt),
          "weekly",
          "0.8",
        ),
      );
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

<!-- Static pages -->
  <url>
    <loc>${P}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${P}/explore</loc>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>

<!-- Users -->
${userUrls.join("")}

<!-- Collections -->
${collectionUrls.join("")}

<!-- Notes -->
${noteUrls.join("")}

</urlset>`;
}

// ─── GET /sitemap.xml ─────────────────────────────────────────────────────────

export async function getSitemap(req, res) {
  try {
    const siteUrl = resolveSiteUrl(req);

    let template = await getTemplateFromCache();

    if (!template) {
      template = await buildSitemapTemplate();
      await saveTemplateToCache(template);
    }

    // replaceAll is available in Node 15+; use a regex for broader compat
    const xml = template.split("__SITE_URL__").join(siteUrl);

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.send(xml);
  } catch (err) {
    console.error("❌ Sitemap generation failed:", err);
    return res.status(500).send("Failed to generate sitemap");
  }
}

// ─── DELETE /sitemap/cache (admin only) ───────────────────────────────────────

export async function bustSitemapCache(req, res) {
  try {
    await delCache(SITEMAP_CACHE_KEY);
    return res.status(200).json({
      message: "Sitemap cache cleared. Next request will rebuild from DB.",
    });
  } catch (err) {
    console.error("❌ Sitemap cache bust failed:", err);
    return res.status(500).json({ message: "Failed to clear sitemap cache" });
  }
}