// indexer/updateIndex.js
import SearchIndex from "../../model/searchIndex.model.js";

export async function updateIndex(noteId, oldKeywords, newKeywords) {
  const added = newKeywords.filter((w) => !oldKeywords.includes(w));
  const removed = oldKeywords.filter((w) => !newKeywords.includes(w));

  const ops = [];

  for (const lemma of added) {
    ops.push({
      updateOne: {
        filter: { lemma },
        update: { $addToSet: { noteIds: noteId } },
        upsert: true,
      },
    });
  }

  for (const lemma of removed) {
    ops.push({
      updateOne: {
        filter: { lemma },
        update: { $pull: { noteIds: noteId } },
      },
    });
  }

  if (ops.length) {
    await SearchIndex.bulkWrite(ops);
  }
}
