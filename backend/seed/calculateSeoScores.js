import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

import mongoose from "mongoose";
import Note from "../model/note.model.js";
import { calculateSEOScore } from "../services/seo.service.js";

async function run() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI is not defined in the environment");
    }
    console.log("🔌 Connecting to DB...");
    await mongoose.connect(mongoUri);

    console.log("🔍 Fetching notes...");
    const notes = await Note.find({});
    console.log(`Found ${notes.length} notes. Starting SEO score calculation...`);

    let updatedCount = 0;
    for (const note of notes) {
      const score = calculateSEOScore(note);
      
      await Note.updateOne({ _id: note._id }, { $set: { "seo.score": score } });
      updatedCount++;
      console.log(`[${updatedCount}/${notes.length}] Note: "${note.name}" | SEO Score: ${score}`);
    }

    console.log(`✅ Completed updating SEO scores for ${updatedCount} notes.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during SEO scoring script:", error);
    process.exit(1);
  }
}

run();
