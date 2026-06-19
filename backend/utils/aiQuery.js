import { Types } from "mongoose";

/**
 * Auto-compressed schema context for NoteHub AI Query Console.
 */

export const SCHEMA_CONTEXT = `
## NoteHub MongoDB Schema

User { _id, email, password*, googleId, fullName, userName(unique), avatar, cover, hasGoogleAuth, role(user|admin), bio, socials:[{url}], skills, isBanned, isDeleted, github:{username,accessToken,connectedAt} }

Collection { _id, name, slug, userId→User, visibility(public|private), collaborators:[→User] }

Note { _id, name, slug, content, seo:{title,description,keywords,image:{url,alt},score}, tableOfContent:[{id,text,level,order}], collectionId→Collection, userId→User, visibility(public|private), collaborators:[→User], contentUpdatedAt }

SearchIndex { _id, lemma(unique), notes:[{noteId→Note, tf:number}] }

LinkGraphCrawl { _id, status(running|completed|failed), edges:[{from→Note,to→Note,fromSlug,toSlug}], nodes:[{noteId→Note,slug,title,fullPath,incomingCount,outgoingCount,isOrphan,isDeadEnd,isIsolated,hasBrokenLinks,hasHttp}], brokenLinks:[{from→Note,fromSlug,href}], summary:{totalNotes,totalEdges,orphanCount,deadEndCount,brokenLinkCount,httpLinkCount}, triggeredBy→User, completedAt, errorMessage }

Session { _id, sessionId(unique), userId→User, refreshTokenHash*, deviceName, ip, location, lastActiveAt, expiresAt(TTL) }

Image { _id, userId→User, url, publicId }

Otp { _id, purpose(signup|password_reset|email_update), email, otp*, expiresAt(TTL), lastSentAt }

Campaign { _id, name, subject, previewText, htmlBody, extraJson, emails, status(draft|sending|done|failed), sentAt, stats:{total,sent,skipped,failed,opened,clicked} }

CampaignJob { _id, campaignId→Campaign, email, status(pending|sent|failed|skipped), brevoMessageId, error, processedAt, openCount, clickCount, firstOpenedAt, firstClickedAt }

SuppressedEmail { _id, email(unique), campaignId→Campaign, unsubscribedAt }

Template { _id, name, subject, htmlBody, previewText, previewImage, mode(shared|per_recipient) }

Contact { _id, label(unique), emails:[string] }

## Relations
User 1:N → Collection, Note, Session, Image, LinkGraphCrawl
User N:M ↔ Collection (collaborators), Note (collaborators)
Collection 1:N → Note
Campaign 1:N → CampaignJob, SuppressedEmail
SearchIndex N:M ↔ Note (via notes[].noteId)
LinkGraphCrawl N:M ↔ Note (via edges[].from/to, nodes[].noteId)

## Collection names (for aggregation)
User→users, Collection→collections, Note→notes, SearchIndex→searchindexes,
LinkGraphCrawl→linkgraphcrawls, Session→sessions, Image→images, Otp→otps,
Campaign→campaigns, CampaignJob→campaignjobs, SuppressedEmail→suppressedemails,
Template→templates, Contact→contacts

## NoteHub URL format
https://notehub-official.vercel.app/{userName}/{collectionSlug}/{noteSlug}

## Query rules
- NEVER expose: password, refreshTokenHash, otp, googleId, github.accessToken
- ALWAYS $project out __v, password, refreshTokenHash, otp, googleId, github.accessToken
- For boolean checks use: { $cond: { if: { $gt: ["$field", null] }, then: true, else: false } }
- Fields marked * must NEVER appear in results under any alias
- If the query is ambiguous or cannot be answered from the schema, return: { "collection": "none", "pipeline": [], "explanation": "<reason why>" }
- Do NOT invent field names. Only use fields explicitly listed in the schema above.
- Use $limit in every query that returns a list. Default limit is 20 unless the user specifies otherwise.
- ObjectId string values for _id or reference fields must be written as plain 24-char hex strings — do NOT wrap them in ObjectId().
`.trim();

export const SYSTEM_PROMPT = `You are a MongoDB aggregation pipeline generator for the NoteHub platform.

${SCHEMA_CONTEXT}

Given a natural language query, return ONLY a valid JSON object with no markdown fences or extra text:
{
  "collection": "collectionName",
  "pipeline": [ ...aggregation stages ],
  "explanation": "one sentence describing what this query does"
}

## Few-shot examples

Q: "How many users signed up with Google?"
A: {"collection":"users","pipeline":[{"$match":{"hasGoogleAuth":true}},{"$count":"total"}],"explanation":"Counts users who authenticated via Google OAuth."}

Q: "Top 5 notes by SEO score"
A: {"collection":"notes","pipeline":[{"$match":{"seo.score":{"$gt":0}}},{"$sort":{"seo.score":-1}},{"$limit":5},{"$project":{"__v":0,"content":0}}],"explanation":"Returns the 5 notes with the highest SEO scores."}

Q: "How many emails were opened in the last campaign?"
A: {"collection":"campaigns","pipeline":[{"$sort":{"sentAt":-1}},{"$limit":1},{"$project":{"name":1,"stats.opened":1,"stats.total":1,"__v":0}}],"explanation":"Returns open count from the most recently sent campaign."}

Q: "List all notes with broken links"
A: {"collection":"linkgraphcrawls","pipeline":[{"$match":{"status":"completed"}},{"$sort":{"completedAt":-1}},{"$limit":1},{"$unwind":"$nodes"},{"$match":{"nodes.hasBrokenLinks":true}},{"$limit":50},{"$project":{"nodes.slug":1,"nodes.title":1,"nodes.fullPath":1,"_id":0}}],"explanation":"Returns up to 50 nodes flagged as having broken links from the latest completed crawl."}`;

export const MODEL_MAP = {
  users: "User",
  collections: "Collection",
  notes: "Note",
  searchindexes: "SearchIndex",
  linkgraphcrawls: "LinkGraphCrawl",
  sessions: "Session",
  images: "Image",
  otps: "Otp",
  campaigns: "Campaign",
  campaignjobs: "CampaignJob",
  suppressedemails: "SuppressedEmail",
  templates: "Template",
  contacts: "Contact",
};

export const ALLOWED_COLLECTIONS = new Set(Object.keys(MODEL_MAP));

export const ALLOWED_STAGES = new Set([
  "$match",
  "$group",
  "$project",
  "$sort",
  "$limit",
  "$skip",
  "$unwind",
  "$addFields",
  "$set",
  "$count",
  "$sortByCount",
  "$bucket",
  "$bucketAuto",
  "$facet",
  "$replaceRoot",
  "$replaceWith",
  "$sample",
  "$lookup",
]);

const BLOCKED_OPS = new Set(["$function", "$accumulator", "$where"]);

const MAX_PIPELINE_LIMIT = 1000;
const MAX_PIPELINE_STAGES = 15; // bumped from 10 — complex analytical queries need room

/**
 * Explicit whitelist of field keys that hold MongoDB ObjectId references.
 * Using endsWith('Id') was too broad — it would mutate slugs, sessionId, publicId, etc.
 */
const OBJECT_ID_FIELDS = new Set([
  "_id",
  "userId",
  "collectionId",
  "noteId",
  "campaignId",
  "triggeredBy",
  "from",
  "to",
]);

function walkExpr(expr, path = ""){
  if (Array.isArray(expr)) {
    expr.forEach((v, i) => walkExpr(v, `${path}[${i}]`));
    return;
  }
  if (expr && typeof expr === "object") {
    for (const [key, val] of Object.entries(expr)) {
      if (BLOCKED_OPS.has(key)) {
        throw new Error(`Operator "${key}" is not allowed (path: ${path}.${key})`);
      }
      walkExpr(val, `${path}.${key}`);
    }
  }
}

function validateStage(stage, index){
  const keys = Object.keys(stage);
  if (keys.length !== 1) {
    throw new Error(
      `Stage [${index}] must have exactly one operator key, got: ${keys.join(", ")}`
    );
  }

  const [op] = keys;

  if (op === "$lookup") {
    const lookup = stage.$lookup;
    const from = lookup?.from;
    if (!from || !ALLOWED_COLLECTIONS.has(from)) {
      throw new Error(
        `$lookup.from "${from}" is not an allowed collection`
      );
    }
    // Validate sub-pipeline stages if present
    if (Array.isArray(lookup.pipeline)) {
      (lookup.pipeline).forEach(
        (subStage, si) => validateStage(subStage, si)
      );
    }
    walkExpr(lookup, `$lookup`);
    return;
  }

  if (!ALLOWED_STAGES.has(op)) {
    throw new Error(`Stage "${op}" is not in the allowed stage list`);
  }

  walkExpr(stage[op], op);
}

export function validatePipeline(pipeline){
  if (!Array.isArray(pipeline) || pipeline.length === 0) {
    throw new Error("Pipeline must be a non-empty array");
  }

  if (pipeline.length > MAX_PIPELINE_STAGES) {
    throw new Error(
      `Pipeline has ${pipeline.length} stages, max allowed is ${MAX_PIPELINE_STAGES}`
    );
  }

  const hasGuard = pipeline.some(
    (s) => "$match" in s || "$limit" in s || "$count" in s
  );
  if (!hasGuard) {
    throw new Error(
      "Pipeline must contain at least one $match, $limit, or $count stage to prevent full collection scans"
    );
  }

  for (const stage of pipeline) {
    if ("$limit" in stage && (stage).$limit > MAX_PIPELINE_LIMIT) {
      throw new Error(
        `$limit value exceeds maximum allowed (${MAX_PIPELINE_LIMIT})`
      );
    }
  }

  pipeline.forEach((stage, i) =>
    validateStage(stage, i)
  );
}

/**
 * Cast known ObjectId reference fields from hex strings to ObjectId instances.
 * Only casts fields in OBJECT_ID_FIELDS to avoid mutating slugs, sessionIds, etc.
 */
export function castObjectIds(pipeline) {
  return JSON.parse(JSON.stringify(pipeline), (key, val) => {
    if (
      OBJECT_ID_FIELDS.has(key) &&
      typeof val === "string" &&
      /^[0-9a-fA-F]{24}$/.test(val) // strict 24-char hex — more reliable than Types.ObjectId.isValid
    ) {
      return new Types.ObjectId(val);
    }
    return val;
  });
}

/**
 * Serialize a pipeline back to plain JSON (ObjectId → hex string).
 * Used to safely feed executed/mutated pipelines back to the AI as retry context.
 */
export function serializePipeline(pipeline) {
  return JSON.parse(
    JSON.stringify(pipeline, (_key, val) => {
      if (val instanceof Types.ObjectId) return val.toHexString();
      return val;
    })
  );
}