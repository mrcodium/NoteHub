import mongoose from "mongoose";
import fs from "fs";
import Note from "../../model/note.model.js";
import SearchIndex from "../../model/searchIndex.model.js";
import { extractKeywords } from "./textProcessor.js";

async function reindex() {
  try {
    console.log("connecting...");
    await mongoose.connect("mongodb+srv://abhijeet62008:alpha%20knight@cluster0.xwec2.mongodb.net/notehub?retryWrites=true&w=majority&appName=Cluster0");

    console.log("⚠️ Clearing existing search index...");
    await SearchIndex.deleteMany({});

    const cursor = Note.find({}).cursor();
    const bulkMap = new Map(); // word -> Set(noteId)

    for await (const note of cursor) {
      const keywords = extractKeywords(`${note.name} ${note.content}` || "");
      for (const word of keywords) {
        if (!bulkMap.has(word)) {
          bulkMap.set(word, new Set());
        }
        bulkMap.get(word).add(note._id.toString());
      }
    }

    console.log(`📦 Preparing bulk operations (${bulkMap.size} words)...`);

    const ops = [];
    for (const [word, ids] of bulkMap.entries()) {
      ops.push({
        insertOne: {
          document: {
            lemma: word,
            noteIds: [...ids].map((id) => new mongoose.Types.ObjectId(id)),
          },
        },
      });
    }

    // 👉 Save ops in a JSON file
    fs.writeFileSync("reindex_ops.json", JSON.stringify(ops, null, 2), "utf-8");
    console.log("📝 Bulk operations saved to reindex_ops.json");

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