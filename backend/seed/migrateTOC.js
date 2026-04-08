/**
 * migrate-toc.js
 *
 * One-time migration: reads every Note document, extracts the
 * tableOfContent from its HTML content, adds IDs to headings, and writes it back.
 *
 * Usage:
 *   MONGO_URI=mongodb://... node migrate-toc.js
 *   node migrate-toc.js --dry-run          (preview without writing)
 *   node migrate-toc.js --batch-size 200   (tune for your cluster)
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

import mongoose from "mongoose";
import { extractTOCAndAddIds } from "../services/extractTOC.js";
import dns from "dns";

dns.setServers(['8.8.8.8', '8.8.4.4']);

/* ─────────────────────────────────────────────
   CONFIG  – override via env or CLI flags
───────────────────────────────────────────── */

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const BATCH_SIZE = parseInt(
  (args.find((a) => a.startsWith("--batch-size="))?.split("=")[1] ||
    args[args.indexOf("--batch-size") + 1]) ??
    "100",
  10,
);

/* ─────────────────────────────────────────────
   MINIMAL SCHEMA  (only what the migration needs)
   We avoid importing the full Note model so this
   script stays self-contained and safe to run
   outside your main app.
───────────────────────────────────────────── */
const tocEntrySchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    level: { type: Number, required: true, min: 1, max: 6 },
    order: { type: Number, required: true },
  },
  { _id: false },
);

const noteSchema = new mongoose.Schema(
  {
    content: { type: String, default: "" },
    tableOfContent: { type: [tocEntrySchema], default: [] },
  },
  { strict: false, timestamps: true }, // strict:false preserves untouched fields
);

const Note = mongoose.model("Note", noteSchema);

/* ─────────────────────────────────────────────
   STATS TRACKER
───────────────────────────────────────────── */
const stats = {
  total: 0,
  updated: 0,
  empty: 0, // no headings found
  errors: 0,
  idsAdded: 0, // new IDs injected
  idsReplaced: 0, // existing IDs replaced
};

/* ─────────────────────────────────────────────
   CORE MIGRATION
───────────────────────────────────────────── */
async function migrateNote(note) {
  try {
    // ✅ NO SKIP LOGIC - Always process every note
    
    const { html, toc } = extractTOCAndAddIds(note.content);

    if (toc.length === 0) {
      stats.empty++;
      // Still write the empty array so the field exists
    } else {
      // Count IDs added vs replaced
      const originalIdCount = (note.content.match(/<h[1-6][^>]*\sid=/gi) || []).length;
      const newIdCount = (html.match(/<h[1-6][^>]*\sid=/gi) || []).length;
      
      if (originalIdCount === 0) {
        stats.idsAdded += newIdCount;
      } else {
        stats.idsReplaced += originalIdCount;
        stats.idsAdded += (newIdCount - originalIdCount);
      }
    }

    if (!DRY_RUN) {
      await Note.updateOne(
        { _id: note._id },
        { 
          $set: { 
            tableOfContent: toc,
            content: html // ✅ Always update content with synced IDs
          } 
        },
      );
    } else {
      console.log(`[DRY-RUN] Note ${note._id}  →  ${toc.length} heading(s)`);
      if (toc.length > 0) {
        toc.forEach((h) =>
          console.log(
            `   ${"  ".repeat(h.level - 1)}H${h.level} [${h.id}] ${h.text}`,
          ),
        );
      }
    }

    stats.updated++;
  } catch (error) {
    stats.errors++;
    console.error(`  ✗ Failed on Note ${note._id}:`, error.message);
  }
}

async function run() {

  // Support both MONGODB_URI and MONGO_URI for compatibility
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.log("MONGODB_URI and MONGO_URI are both undefined.");
    return;
  }

  console.log("──────────────────────────────────────────");
  console.log(" TOC Migration - Force Sync IDs");
  console.log(`  Batch size : ${BATCH_SIZE}`);
  console.log(`  Dry run    : ${DRY_RUN}`);
  console.log("──────────────────────────────────────────\n");

  console.log(mongoUri);
  await mongoose.connect(mongoUri);
  console.log("✓ Connected to MongoDB\n");

  stats.total = await Note.countDocuments();
  console.log(`  Notes to process: ${stats.total}\n`);

  let processed = 0;
  let lastId = null;

  // Cursor-based pagination (safe for large collections, no skip penalty)
  while (true) {
    const query = lastId ? { _id: { $gt: lastId } } : {};

    const batch = await Note.find(query)
      .sort({ _id: 1 })
      .limit(BATCH_SIZE)
      .select("_id content tableOfContent")
      .lean();

    if (batch.length === 0) break;

    for (const note of batch) {
      await migrateNote(note);
      processed++;
    }

    lastId = batch[batch.length - 1]._id;

    const pct = ((processed / stats.total) * 100).toFixed(1);
    process.stdout.write(`\r  Progress: ${processed}/${stats.total} (${pct}%)`);
  }

  console.log("\n");

  /* ── Summary ── */
  console.log("──────────────────────────────────────────");
  console.log(" Migration complete");
  console.log(`  Total         : ${stats.total}`);
  console.log(
    `  Updated       : ${stats.updated}${DRY_RUN ? " (dry-run, no writes)" : ""}`,
  );
  console.log(`  Empty         : ${stats.empty}   (no headings in content)`);
  console.log(`  IDs added     : ${stats.idsAdded}  (new heading anchors)`);
  console.log(`  IDs replaced  : ${stats.idsReplaced}  (existing IDs updated)`);
  console.log(`  Errors        : ${stats.errors}`);
  console.log("──────────────────────────────────────────\n");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("\n✗ Migration failed:", err);
  mongoose.disconnect();
  process.exit(1);
});