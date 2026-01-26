import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";

import Collection from "../model/collection.model.js";
import Note from "../model/note.model.js";
import User from "../model/user.model.js";
import { ENV } from "../config/env.js";

// load env from backend/.env
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const SITE_URL = "https://notehub-38kp.onrender.com";

// Mongo connection
await mongoose
  .connect(ENV.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

async function generateSitemap() {
  try {
    /* ───────────────────── USERS ───────────────────── */

    const users = await User.find({})
      .select("_id userName updatedAt")
      .lean();

    const userMap = new Map(users.map(u => [u._id.toString(), u.userName]));

    const userUrls = users.map(user => `
  <url>
    <loc>${SITE_URL}/user/${user.userName}</loc>
    <lastmod>${user.updatedAt.toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);

    /* ─────────────────── COLLECTIONS ─────────────────── */

    const collections = await Collection.find({ visibility: "public" })
      .select("_id slug userId updatedAt")
      .lean();

    const collectionMap = new Map(
      collections.map(c => [c._id.toString(), c.slug])
    );

    const collectionUrls = collections.map(col => {
      const userName = userMap.get(col.userId.toString());
      if (!userName || !col.slug) return null;

      return `
  <url>
    <loc>${SITE_URL}/user/${userName}/${col.slug}</loc>
    <lastmod>${col.updatedAt.toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }).filter(Boolean);

    /* ───────────────────── NOTES ───────────────────── */

    const notes = await Note.find({
      visibility: "public",
      collectionId: { $in: collections.map(c => c._id) }
    })
      .select("_id slug collectionId userId updatedAt")
      .lean();

    const noteUrls = notes.map(note => {
      const userName = userMap.get(note.userId.toString());
      const collectionSlug = collectionMap.get(note.collectionId.toString());

      if (!userName || !collectionSlug || !note.slug) return null;

      return `
  <url>
    <loc>${SITE_URL}/user/${userName}/${collectionSlug}/${note.slug}</loc>
    <lastmod>${note.contentUpdatedAt.toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }).filter(Boolean);

    /* ───────────────────── FINAL XML ───────────────────── */

    const sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

<!-- 👤 USERS -->
${userUrls.join("\n")}

<!-- 📁 COLLECTIONS -->
${collectionUrls.join("\n")}

<!-- 📝 NOTES -->
${noteUrls.join("\n")}

</urlset>`;

    const filePath = path.join(process.cwd(), "public-sitemap.xml");
    fs.writeFileSync(filePath, sitemapXML.trim(), "utf-8");

    console.log("✅ Sitemap generated successfully");
    console.log(`📄 ${filePath}`);
    console.log(
      `📊 Users: ${userUrls.length}, Collections: ${collectionUrls.length}, Notes: ${noteUrls.length}`
    );
  } catch (err) {
    console.error("❌ Sitemap generation failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

// run
generateSitemap();
