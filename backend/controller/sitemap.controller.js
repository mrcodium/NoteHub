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
  // Priority: ?siteUrl query param → Origin header → Referer header → fallback
  const fromQuery = req.query.siteUrl;
  const fromOrigin = req.headers["origin"];
  const fromReferer = req.headers["referer"]
    ? new URL(req.headers["referer"]).origin
    : null;

  const candidate = fromQuery || fromOrigin || fromReferer || FALLBACK_SITE_URL;
  const normalized = candidate.replace(/\/$/, "");

  return normalized;
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

// ─── Build template with __SITE_URL__ placeholder ─────────────────────────────

async function buildSitemapTemplate() {
  const P = "__SITE_URL__"; // placeholder

  /* USERS */
  const users = await User.find({}).select("_id userName updatedAt").lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u.userName]));

  const userUrls = users.map((u) =>
    buildUrl(
      P,
      `/user/${u.userName}`,
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
        `/user/${userName}/${col.slug}`,
        toDateString(col.updatedAt),
        "weekly",
        "0.7",
      );
    })
    .filter(Boolean);

  /* NOTES */
  const notes = await Note.find({
    visibility: "public",
    collectionId: { $in: collections.map((c) => c._id) },
  })
    .select("_id slug collectionId userId updatedAt contentUpdatedAt")
    .lean();

  const noteUrls = notes
    .map((note) => {
      const userName = userMap.get(note.userId.toString());
      const collectionSlug = collectionMap.get(note.collectionId.toString());
      if (!userName || !collectionSlug || !note.slug) return null;
      return buildUrl(
        P,
        `/user/${userName}/${collectionSlug}/${note.slug}`,
        toDateString(note.contentUpdatedAt || note.updatedAt),
        "weekly",
        "0.8",
      );
    })
    .filter(Boolean);

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

// ─── Controller ───────────────────────────────────────────────────────────────

export async function getSitemap(req, res) {
  try {
    const siteUrl = resolveSiteUrl(req);
    // Try Redis first
    let template = await getCache(SITEMAP_CACHE_KEY);

    if (!template) {
      // Cache miss — rebuild from DB and store in Redis
      template = await buildSitemapTemplate();
      await setCache(SITEMAP_CACHE_KEY, template, CACHE_TTL_SEC);
    }

    // Swap __SITE_URL__ placeholder with this client's base URL
    const xml = template.replaceAll("__SITE_URL__", siteUrl);

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.send(xml);
  } catch (err) {
    console.error("❌ Sitemap generation failed:", err);
    return res.status(500).send("Failed to generate sitemap");
  }
}

// Call this after any note/collection publish or unpublish
export async function bustSitemapCache(_, res) {
  try {
    await delCache(SITEMAP_CACHE_KEY);

    return res.status(200).json({
      message: "Sitemap cache cleared. Next request will rebuild from DB.",
    });
  } catch (error) {
    console.error("❌ Sitemap cache bust failed:", err);
    return res.status(500).json({ message: "Failed to clear sitemap cache" });
  }
}
