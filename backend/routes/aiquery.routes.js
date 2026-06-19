import express from "express";
import mongoose from "mongoose";
import {
  castObjectIds,
  serializePipeline,
  MODEL_MAP,
  SYSTEM_PROMPT,
  validatePipeline,
} from "../utils/aiQuery.js";
import { ENV } from "../config/env.js";
import Groq from "groq-sdk";

const router = express.Router();
const groq = new Groq({ apiKey: ENV.GROQ_API_KEY });

const MAX_RETRIES = 3;
const LLM_TIMEOUT_MS = 12000;
const AGG_TIMEOUT_MS = 5000;

const NON_RETRYABLE_PATTERNS = [
  "maxtimems",
  "timeout",
  "etimedout",
  "rate_limit",
  "econnreset",
  "enotfound",
  "failed to connect",
  "topology is closed",
];

function isNonRetryable(msg) {
  const lower = msg.toLowerCase();
  return NON_RETRYABLE_PATTERNS.some((p) => lower.includes(p));
}

async function callLLM(query, previousAttempts) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: query },
  ];

  for (const { pipeline, error } of previousAttempts) {
    messages.push({
      role: "assistant",
      content: JSON.stringify({ pipeline }, null, 0),
    });
    messages.push({
      role: "user",
      content:
        `That pipeline failed with the following error:\n\n"${error}"\n\n` +
        `Fix the pipeline. Return ONLY the corrected JSON object — no explanation outside the JSON.`,
    });
  }

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    max_completion_tokens: 1024,
    response_format: { type: "json_object" },
    messages,
  });

  const raw = response.choices?.[0]?.message?.content ?? "";

  if (!raw.trim()) {
    throw new Error("LLM_EMPTY: model returned an empty response");
  }

  // Strip accidental markdown fences the model might still wrap around JSON
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(
      `LLM_PARSE: could not parse model response as JSON — ${e.message}\nRaw: ${raw.slice(0, 300)}`
    );
  }

  if (
    !parsed ||
    typeof parsed.collection !== "string" ||
    !Array.isArray(parsed.pipeline)
  ) {
    throw new Error(
      `LLM_SCHEMA: model returned valid JSON but missing required fields (collection, pipeline). Got: ${JSON.stringify(parsed).slice(0, 200)}`
    );
  }

  return parsed;
}

router.post("/ai", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query?.trim()) {
      return res.status(400).json({ error: "Query is required" });
    }

    const previousAttempts = [];

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      // --------------------------------------------------------
      // Phase 1: Generate pipeline via LLM
      // --------------------------------------------------------
      let parsed;

      try {
        const llmPromise = callLLM(query, previousAttempts);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("LLM_TIMEOUT: model did not respond in time")),
            LLM_TIMEOUT_MS
          )
        );

        parsed = await Promise.race([llmPromise, timeoutPromise]);
        console.log(
          `[ai-query] attempt ${attempt} — pipeline generated for collection: ${parsed.collection}`
        );
      } catch (err) {
        const msg = err?.message ?? "Unknown LLM error";

        if (isNonRetryable(msg) || msg.startsWith("LLM_TIMEOUT")) {
          return res.status(503).json({
            error: "LLM temporarily unavailable",
            detail: msg,
            attempt,
          });
        }

        if (msg.startsWith("LLM_PARSE") || msg.startsWith("LLM_SCHEMA")) {
          if (attempt === MAX_RETRIES) {
            return res.status(422).json({
              error: "Model returned malformed output after max retries",
              detail: msg,
              attempts: attempt,
            });
          }
          previousAttempts.push({ pipeline: [], error: msg });
          continue;
        }

        return res.status(422).json({
          error: "Pipeline generation failed",
          detail: msg,
          attempt,
        });
      }

      // --------------------------------------------------------
      // Sentinel: model declared the query unanswerable
      // --------------------------------------------------------
      if (parsed.collection === "none") {
        return res.status(400).json({
          error: "Query could not be answered from the schema",
          explanation: parsed.explanation ?? "No explanation provided",
        });
      }

      // --------------------------------------------------------
      // Phase 2: Validate collection and pipeline
      // --------------------------------------------------------
      const modelName = MODEL_MAP[parsed.collection.toLowerCase()];
      if (!modelName) {
        return res.status(400).json({
          error: `Collection "${parsed.collection}" is not allowed`,
          allowedCollections: Object.keys(MODEL_MAP),
        });
      }

      const rawPipeline = parsed.pipeline;
      let safePipeline;

      try {
        safePipeline = castObjectIds(rawPipeline);
        validatePipeline(safePipeline);
      } catch (err) {
        const msg = err?.message ?? "Unknown validation error";

        const isDuplicate = previousAttempts.some(
          (a) =>
            JSON.stringify(a.pipeline) === JSON.stringify(rawPipeline) &&
            a.error === msg
        );

        if (!isDuplicate) {
          previousAttempts.push({ pipeline: rawPipeline, error: msg });
        }

        if (attempt === MAX_RETRIES) {
          return res.status(400).json({
            error: "Pipeline validation failed after max retries",
            detail: msg,
            attempts: attempt,
            lastPipeline: rawPipeline,
          });
        }

        console.warn(`[ai-query] attempt ${attempt} validation failed: ${msg}`);
        continue;
      }

      // --------------------------------------------------------
      // Phase 3: Execute aggregation
      // --------------------------------------------------------
      try {
        const result = await mongoose
          .model(modelName)
          .aggregate(safePipeline)
          .option({ maxTimeMS: AGG_TIMEOUT_MS });

        return res.json({
          success: true,
          result,
          collection: parsed.collection,
          pipeline: serializePipeline(safePipeline),
          explanation: parsed.explanation,
          attempts: attempt,
        });
      } catch (err) {
        const msg = err?.message ?? "Unknown aggregation error";
        console.warn(`[ai-query] attempt ${attempt} aggregation failed: ${msg}`);

        if (isNonRetryable(msg)) {
          return res.status(500).json({
            error: "Non-retryable aggregation error",
            detail: msg,
            attempt,
          });
        }

        const serialized = serializePipeline(safePipeline);
        const isDuplicate = previousAttempts.some(
          (a) =>
            JSON.stringify(a.pipeline) === JSON.stringify(serialized) &&
            a.error === msg
        );

        if (!isDuplicate) {
          previousAttempts.push({ pipeline: serialized, error: msg });
        }

        if (attempt === MAX_RETRIES) {
          return res.status(500).json({
            error: "Aggregation failed after max retries",
            detail: msg,
            attempts: attempt,
            lastPipeline: serialized,
          });
        }
      }
    }

    return res.status(500).json({ error: "Unexpected exit from retry loop" });
  } catch (err) {
    console.error("[ai-query] fatal:", err);
    return res.status(500).json({
      error: "Internal server error",
      detail: err?.message,
    });
  }
});


/**
 * Parses a mongosh-style query string:
 *   db.users.aggregate([...])
 *
 * Returns { collection: string, pipeline: any[] }
 * Throws a descriptive error if the input doesn't match the expected format.
 */
function parseRawQuery(raw) {
  const trimmed = raw.trim();

  // Match: db.<collection>.aggregate(<json>)
  const match = trimmed.match(
    /^db\s*\.\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\.\s*aggregate\s*\(\s*([\s\S]*)\s*\)\s*;?\s*$/
  );

  if (!match) {
    throw new Error(
      'Invalid syntax. Expected: db.<collection>.aggregate([...])' 
    );
  }

  const collection = match[1].toLowerCase();
  const pipelineStr = match[2].trim();

  let pipeline;
  try {
    // Use JSON.parse — pipeline must be valid JSON (not JS)
    // We intentionally keep it strict: no ObjectId() shorthand in raw mode
    // unless the user writes valid EJSON {"$oid": "..."}
    pipeline = JSON.parse(pipelineStr);
  } catch (e) {
    throw new Error(
      `Pipeline is not valid JSON — ${e.message}. ` +
      `Make sure to use double quotes and valid JSON syntax. ` +
      `For ObjectIds use {"$oid": "..."} and for dates use {"$date": "..."}.`
    );
  }

  if (!Array.isArray(pipeline)) {
    throw new Error("Pipeline must be a JSON array: db.collection.aggregate([...])");
  }

  return { collection, pipeline };
}

// POST /admin/raw-query
router.post("/raw", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query?.trim()) {
      return res.status(400).json({ error: "Query is required" });
    }

    // --------------------------------------------------------
    // Phase 1: Parse the raw query string
    // --------------------------------------------------------
    let collection, rawPipeline;
    try {
      ({ collection, pipeline: rawPipeline } = parseRawQuery(query));
    } catch (err) {
      return res.status(400).json({
        error: "Parse error",
        detail: err.message,
      });
    }

    // --------------------------------------------------------
    // Phase 2: Validate collection against allowlist
    // --------------------------------------------------------
    const modelName = MODEL_MAP[collection];
    if (!modelName) {
      return res.status(400).json({
        error: `Collection "${collection}" is not allowed`,
        allowedCollections: Object.keys(MODEL_MAP),
      });
    }

    // --------------------------------------------------------
    // Phase 3: Cast ObjectIds + validate pipeline structure
    // --------------------------------------------------------
    let safePipeline;
    try {
      safePipeline = castObjectIds(rawPipeline);
      validatePipeline(safePipeline);
    } catch (err) {
      return res.status(400).json({
        error: "Pipeline validation failed",
        detail: err.message,
      });
    }

    // --------------------------------------------------------
    // Phase 4: Execute (read-only — aggregate only)
    // --------------------------------------------------------
    try {
      const result = await mongoose
        .model(modelName)
        .aggregate(safePipeline)
        .option({ maxTimeMS: AGG_TIMEOUT_MS });

      return res.json({
        success: true,
        result,
        collection,
        pipeline: serializePipeline(safePipeline),
        attempts: 1,
      });
    } catch (err) {
      const msg = err?.message ?? "Unknown aggregation error";
      console.error("[raw-query] aggregation error:", msg);

      return res.status(500).json({
        error: "Aggregation failed",
        detail: msg,
      });
    }
  } catch (err) {
    console.error("[raw-query] fatal:", err);
    return res.status(500).json({
      error: "Internal server error",
      detail: err?.message,
    });
  }
});

export default router;