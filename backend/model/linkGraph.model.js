import mongoose from "mongoose";

/* ─────────────────────────────────────────────
   SUB-SCHEMA: graph edge  (articleId → articleId)
   slug is stored only for display — never used
   as identity. All relations key on ObjectId.
───────────────────────────────────────────── */
const edgeSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Note",
      required: true,
      // Source article
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Note",
      required: true,
      // Destination article (resolved at crawl time)
    },
    // Display-only snapshot — stale after slug rename, never used for lookup
    fromSlug: { type: String },
    toSlug: { type: String },
  },
  { _id: false },
);

/* ─────────────────────────────────────────────
   SUB-SCHEMA: per-node analytics snapshot
───────────────────────────────────────────── */
const nodeSchema = new mongoose.Schema(
  {
    noteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Note",
      required: true,
    },
    // Snapshot slug — for display in the graph UI only
    slug: { type: String },
    title: { type: String },
    // Full navigable path: "username/collectionSlug/noteSlug"
    // Use as href: `/${fullPath}` → /abhijeetsingh/ai-ml/how-machine-learns
    fullPath: { type: String },

    incomingCount: { type: Number, default: 0 },
    outgoingCount: { type: Number, default: 0 },

    // Flags
    isOrphan: { type: Boolean, default: false },    // no incoming links
    isDeadEnd: { type: Boolean, default: false },   // no outgoing links
    isIsolated: { type: Boolean, default: false },   // no incomming + outgoing links
    hasBrokenLinks: { type: Boolean, default: false }, // links to non-existent notes
    hasHttp: { type: Boolean, default: false },     // contains plain http:// links
  },
  { _id: false },
);

/* ─────────────────────────────────────────────
   SUB-SCHEMA: broken link record
───────────────────────────────────────────── */
const brokenLinkSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Note",
      required: true,
    },
    fromSlug: { type: String },
    // The raw href that could not be resolved to any note
    href: { type: String, required: true },
  },
  { _id: false },
);

/* ─────────────────────────────────────────────
   MAIN CRAWL SCHEMA
   One document = one full crawl run.
───────────────────────────────────────────── */
const linkGraphCrawlSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["running", "completed", "failed"],
      default: "running",
    },

    edges: {
      type: [edgeSchema],
      default: [],
    },

    nodes: {
      type: [nodeSchema],
      default: [],
    },

    brokenLinks: {
      type: [brokenLinkSchema],
      default: [],
    },

    summary: {
      totalNotes: { type: Number, default: 0 },
      totalEdges: { type: Number, default: 0 },
      orphanCount: { type: Number, default: 0 },
      deadEndCount: { type: Number, default: 0 },
      brokenLinkCount: { type: Number, default: 0 },
      httpLinkCount: { type: Number, default: 0 },
    },

    // Who triggered the crawl
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    completedAt: { type: Date },
    errorMessage: { type: String },
  },
  {
    timestamps: true, // createdAt = crawl start time
  },
);

// Only ever need the latest crawl — index on createdAt desc
linkGraphCrawlSchema.index({ createdAt: -1 });
linkGraphCrawlSchema.index({ status: 1 });

const LinkGraphCrawl = mongoose.model("LinkGraphCrawl", linkGraphCrawlSchema);
export default LinkGraphCrawl;