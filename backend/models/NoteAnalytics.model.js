// models/NoteAnalytics.model.js
// Compound unique key: (noteUsername, noteCollection, noteSlug)
// This eliminates the slug-collision bug where two users with the same
// noteSlug would overwrite each other's analytics.

import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const QueryRowSchema = new Schema(
  {
    query:       { type: String },
    clicks:      { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    ctr:         { type: Number, default: 0 },
    position:    { type: Number, default: 0 },
  },
  { _id: false },
);

const DeviceStatsSchema = new Schema(
  {
    clicks:      { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
  },
  { _id: false },
);

const GscSchema = new Schema(
  {
    clicks:      { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    ctr:         { type: Number, default: 0 },
    position:    { type: Number, default: 0 },
    topQueries:  { type: [QueryRowSchema], default: [] },
    devices: {
      desktop: { type: DeviceStatsSchema, default: () => ({}) },
      mobile:  { type: DeviceStatsSchema, default: () => ({}) },
      tablet:  { type: DeviceStatsSchema, default: () => ({}) },
    },
    syncedAt: { type: Date },
  },
  { _id: false },
);

const InspectionSchema = new Schema(
  {
    verdict:            { type: String, default: null }, // "PASS" | "FAIL" | "NEUTRAL" | null
    indexingState:      { type: String, default: null },
    robotsTxtState:     { type: String, default: null },
    pageFetchState:     { type: String, default: null },
    lastCrawlTime:      { type: Date,   default: null },
    crawledAs:          { type: String, default: null },
    googleCanonical:    { type: String, default: null },
    userCanonical:      { type: String, default: null },
    richResultsVerdict: { type: String, default: null },
    mobileVerdict:      { type: String, default: null },
    syncedAt:           { type: Date,   default: null },
  },
  { _id: false },
);

// ─── Main schema ──────────────────────────────────────────────────────────────

const NoteAnalyticsSchema = new Schema(
  {
    // ★ Three-part identity — unique together, never collide across users
    noteUsername:   { type: String, required: true, index: true },
    noteCollection: { type: String, required: true },
    noteSlug:       { type: String, required: true },

    // Full URL as crawled by Google (source of truth from GSC)
    noteUrl: { type: String, required: true },

    gsc:        { type: GscSchema,        default: () => ({}) },
    inspection: { type: InspectionSchema, default: () => ({}) },

    lastAnalyticsSync:  { type: Date, default: null },
    lastInspectionSync: { type: Date, default: null },
  },
  {
    timestamps: true, // createdAt + updatedAt
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// ★ Compound unique — prevents slug collisions between different users/collections
NoteAnalyticsSchema.index(
  { noteUsername: 1, noteCollection: 1, noteSlug: 1 },
  { unique: true },
);

// Sort indexes for getCachedAnalytics
NoteAnalyticsSchema.index({ "gsc.clicks":      -1 });
NoteAnalyticsSchema.index({ "gsc.impressions": -1 });
NoteAnalyticsSchema.index({ "gsc.position":     1 });
NoteAnalyticsSchema.index({ "gsc.ctr":         -1 });

// Gap queries
NoteAnalyticsSchema.index({ lastInspectionSync:  1 });
NoteAnalyticsSchema.index({ "inspection.verdict": 1 });
NoteAnalyticsSchema.index({ "gsc.impressions": 1, "inspection.verdict": 1 });

// ─── Export ───────────────────────────────────────────────────────────────────

export default models.NoteAnalytics ?? model("NoteAnalytics", NoteAnalyticsSchema);