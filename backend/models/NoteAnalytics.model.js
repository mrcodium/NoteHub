import mongoose, { Schema } from "mongoose";

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const TopQuerySchema = new Schema(
  {
    query:       { type: String, required: true },
    clicks:      { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    ctr:         { type: Number, default: 0 },   // 0–1 float
    position:    { type: Number, default: 0 },   // avg ranking position
  },
  { _id: false },
);

const GscSearchAnalyticsSchema = new Schema(
  {
    clicks:      { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    ctr:         { type: Number, default: 0 },
    position:    { type: Number, default: 0 },
    topQueries:  { type: [TopQuerySchema], default: [] },
    // Device breakdown
    devices: {
      desktop: { clicks: { type: Number, default: 0 }, impressions: { type: Number, default: 0 } },
      mobile:  { clicks: { type: Number, default: 0 }, impressions: { type: Number, default: 0 } },
      tablet:  { clicks: { type: Number, default: 0 }, impressions: { type: Number, default: 0 } },
    },
    syncedAt: { type: Date, default: null },
  },
  { _id: false },
);

const InspectionSchema = new Schema(
  {
    // "PASS" | "FAIL" | "NEUTRAL" | "VERDICT_UNSPECIFIED"
    verdict:        { type: String, default: null },
    // "INDEXED" | "NOT_INDEXED" | "COVERAGE_UNSPECIFIED"
    indexingState:  { type: String, default: null },
    // "ALLOWED" | "BLOCKED" | "ROBOTS_UNKNOWN"
    robotsTxtState: { type: String, default: null },
    // "SUCCESSFUL" | "SOFT_404" | "BLOCKED_ROBOTS_TXT" | …
    pageFetchState: { type: String, default: null },
    lastCrawlTime:  { type: Date, default: null },
    // "MOBILE" | "DESKTOP" | null
    crawledAs:      { type: String, default: null },
    // "RICH_RESULTS" | "NO_RICH_RESULTS" | null
    richResultsVerdict: { type: String, default: null },
    // "MOBILE_FRIENDLY" | "NOT_MOBILE_FRIENDLY" | null
    mobileVerdict:  { type: String, default: null },
    // canonical URLs as reported by Google
    googleCanonical: { type: String, default: null },
    userCanonical:   { type: String, default: null },
    syncedAt: { type: Date, default: null },
  },
  { _id: false },
);

// ─── Main schema ──────────────────────────────────────────────────────────────

const NoteAnalyticsSchema = new Schema(
  {
    noteSlug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    noteId: {
      type: Schema.Types.ObjectId,
      ref: "Note",
      default: null,
    },
    // Full URL so we don't reconstruct it every time
    noteUrl: {
      type: String,
      required: true,
    },

    gsc:        { type: GscSearchAnalyticsSchema, default: () => ({}) },
    inspection: { type: InspectionSchema,         default: () => ({}) },

    // Track last time each sync job ran (separate from sub-doc syncedAt)
    lastAnalyticsSync:  { type: Date, default: null },
    lastInspectionSync: { type: Date, default: null },
  },
  {
    timestamps: true, // createdAt, updatedAt
  },
);

// ─── Indexes for admin queries ─────────────────────────────────────────────────
NoteAnalyticsSchema.index({ "gsc.clicks":      -1 });
NoteAnalyticsSchema.index({ "gsc.impressions":  -1 });
NoteAnalyticsSchema.index({ "gsc.position":      1 });
NoteAnalyticsSchema.index({ lastAnalyticsSync:   1 });
NoteAnalyticsSchema.index({ lastInspectionSync:  1 });
NoteAnalyticsSchema.index({ "inspection.verdict": 1 });

// ─── Virtuals ─────────────────────────────────────────────────────────────────

// Quick helper: is this note indexed by Google?
NoteAnalyticsSchema.virtual("isIndexed").get(function () {
  return this.inspection?.verdict === "PASS";
});

// CTR as percentage string for display
NoteAnalyticsSchema.virtual("ctrPercent").get(function () {
  return this.gsc?.ctr != null
    ? `${(this.gsc.ctr * 100).toFixed(2)}%`
    : null;
});

NoteAnalyticsSchema.set("toJSON", { virtuals: true });

export default mongoose.model("NoteAnalytics", NoteAnalyticsSchema);
