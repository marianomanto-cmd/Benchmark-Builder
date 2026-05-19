/**
 * Schema Drizzle — fundación de datos de Fase 2 (single-operator).
 * Refleja las fixtures de Fase 1. Todavía NO está cableado a las pantallas;
 * se aplica con `pnpm db:push` una vez que Supabase esté conectado.
 *
 * Multi-tenant (workspaces/RLS) es Fase 4: por ahora una sola cuenta, sin owner.
 */

import {
  pgTable,
  pgEnum,
  text,
  boolean,
  integer,
  doublePrecision,
  timestamp,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core";

export const platformEnum = pgEnum("platform", [
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "x",
  "reddit",
  "mastodon",
  "bluesky",
  "web",
  "meta_ads",
]);

export const sentimentEnum = pgEnum("sentiment", ["pos", "neu", "neg", "mix"]);
export const mentionTypeEnum = pgEnum("mention_type", ["organic", "ad"]);
export const runStatusEnum = pgEnum("run_status", ["queued", "running", "done", "failed", "canceled"]);
export const reportStatusEnum = pgEnum("report_status", ["draft", "published"]);
export const insightKindEnum = pgEnum("insight_kind", ["opp", "thr", "pat", "ano"]);
export const severityEnum = pgEnum("severity", ["high", "med", "low"]);

export const competitors = pgTable("competitors", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  handle: text("handle").notNull(),
  brand: text("brand").notNull(),
  isClient: boolean("is_client").notNull().default(false),
  accent: text("accent"),
  platforms: jsonb("platforms").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const runs = pgTable("runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  label: text("label"),
  status: runStatusEnum("status").notNull().default("queued"),
  costUsd: doublePrecision("cost_usd").notNull().default(0),
  pieceCount: integer("piece_count").notNull().default(0),
  // Plan aprobado (fuentes + parámetros) que originó el run.
  params: jsonb("params").$type<Record<string, unknown>>(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mentions = pgTable("mentions", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id").references(() => runs.id, { onDelete: "cascade" }),
  competitorId: uuid("competitor_id").references(() => competitors.id, { onDelete: "set null" }),
  platform: platformEnum("platform").notNull(),
  author: text("author").notNull(),
  handle: text("handle").notNull(),
  brand: text("brand"),
  body: text("body").notNull(),
  thumbType: text("thumb_type"),
  thumbSrc: text("thumb_src"),
  isAd: boolean("is_ad").notNull().default(false),
  sentiment: sentimentEnum("sentiment").notNull().default("neu"),
  type: mentionTypeEnum("type").notNull().default("organic"),
  engagement: integer("engagement").notNull().default(0),
  metrics: jsonb("metrics").$type<[string, string][]>().notNull().default([]),
  permalink: text("permalink"),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insights = pgTable("insights", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id").references(() => runs.id, { onDelete: "cascade" }),
  kind: insightKindEnum("kind").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  sources: integer("sources").notNull().default(0),
  confidence: doublePrecision("confidence").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  status: reportStatusEnum("status").notNull().default("draft"),
  // Bloques del editor (outline + contenido) como JSON.
  pages: jsonb("pages").$type<Record<string, unknown>[]>().notNull().default([]),
  runId: uuid("run_id").references(() => runs.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  severity: severityEnum("severity").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  evidence: text("evidence"),
  read: boolean("read").notNull().default(false),
  dismissed: boolean("dismissed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Competitor = typeof competitors.$inferSelect;
export type Run = typeof runs.$inferSelect;
export type Mention = typeof mentions.$inferSelect;
export type Insight = typeof insights.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
