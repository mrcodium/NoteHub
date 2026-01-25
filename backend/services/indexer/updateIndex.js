// indexer/updateIndex.js
import SearchIndex from "../../model/searchIndex.model.js";
import { extractKeywordFrequency } from "./textProcessor.js";

/**
 * Reindex a note completely (TF-safe)
 */
export async function updateIndex(noteId, text = "") {
  // 1️⃣ Remove old index entries for this note
  await SearchIndex.updateMany(
    { "notes.noteId": noteId },
    { $pull: { notes: { noteId } } },
  );

  // 2️⃣ Recompute TF from scratch
  const freqMap = extractKeywordFrequency(text);

  // 3️⃣ Insert fresh TF entries
  const ops = Object.entries(freqMap).map(([lemma, tf]) => ({
    updateOne: {
      filter: { lemma },
      update: {
        $push: {
          notes: { noteId, tf },
        },
      },
      upsert: true,
    },
  }));

  if (ops.length) {
    await SearchIndex.bulkWrite(ops);
  }
}
