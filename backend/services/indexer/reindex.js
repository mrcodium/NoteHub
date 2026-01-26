import dotenv from "dotenv"
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

import mongoose from "mongoose";
import fs from "fs";
import Note from "../../model/note.model.js";
import SearchIndex from "../../model/searchIndex.model.js";
import { extractKeywordFrequency } from "./textProcessor.js";

async function reindex() {
  try {
    console.log("🔌 connecting...");
    await mongoose.connect(ENV.MONGO_URI);

    console.log("⚠️ Clearing existing search index...");
    await SearchIndex.deleteMany({});

    const cursor = Note.find({}).cursor();
    const bulkMap = new Map(); // lemma -> Map(noteId -> tf)

    for await (const note of cursor) {
      const freqMap = extractKeywordFrequency(
        `${note.name} ${note.content}` || ""
      );

      for (const [lemma, tf] of Object.entries(freqMap)) {
        if (!bulkMap.has(lemma)) {
          bulkMap.set(lemma, new Map());
        }
        bulkMap.get(lemma).set(note._id.toString(), tf);
      }
    }

    console.log(`📦 Preparing bulk ops (${bulkMap.size} lemmas)...`);

    const ops = [];
    for (const [lemma, noteMap] of bulkMap.entries()) {
      ops.push({
        insertOne: {
          document: {
            lemma,
            notes: [...noteMap.entries()].map(([noteId, tf]) => ({
              noteId: new mongoose.Types.ObjectId(noteId),
              tf,
            })),
          },
        },
      });
    }

    fs.writeFileSync(
      "reindex_ops.json",
      JSON.stringify(ops, null, 2),
      "utf-8"
    );

    if (ops.length) {
      await SearchIndex.bulkWrite(ops);
    }

    console.log("✅ Reindex completed");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

reindex();
