import "server-only";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SEED_DOC, type ReportDoc } from "@/lib/report-doc";
import type { Json } from "@/lib/database.types";

// Persistence for the report editor + public share link. Writes go through the
// service role (no real auth yet — see migration TODO); reads fall back to the
// seed doc so the editor never breaks in demo / before the migration is applied.

export type ReportRecord = { id: string | null; title: string; subtitle: string; doc: ReportDoc; isPublic: boolean; shareToken: string | null };
export type ReportVersion = { id: string; label: string | null; createdAt: string };

const SEED_RECORD: ReportRecord = { id: null, title: SEED_DOC.title, subtitle: SEED_DOC.subtitle, doc: SEED_DOC, isPublic: false, shareToken: null };

type Row = { id: string; title: string; subtitle: string; doc: Json; is_public: boolean; share_token: string | null };
function toRecord(r: Row): ReportRecord {
  return { id: r.id, title: r.title, subtitle: r.subtitle, doc: (r.doc as unknown as ReportDoc) ?? SEED_DOC, isPublic: r.is_public, shareToken: r.share_token };
}

// Load the editor's report (single per project, or a null-project singleton in
// demo), creating it from the seed on first access. Falls back to the seed.
export async function getOrCreateReport(slug?: string): Promise<ReportRecord> {
  const admin = createAdminClient();
  if (!admin) return SEED_RECORD;
  try {
    let pid: string | null = null;
    if (slug) {
      const { data } = await admin.from("projects").select("id").eq("slug", slug).maybeSingle();
      pid = data?.id ?? null;
    }
    const base = admin.from("reports").select("id, title, subtitle, doc, is_public, share_token").order("updated_at", { ascending: false }).limit(1);
    const { data: existing } = await (pid ? base.eq("project_id", pid) : base.is("project_id", null)).maybeSingle();
    if (existing) return toRecord(existing as Row);

    const { data: created } = await admin
      .from("reports")
      .insert({ project_id: pid, title: SEED_DOC.title, subtitle: SEED_DOC.subtitle, doc: SEED_DOC as unknown as Json })
      .select("id, title, subtitle, doc, is_public, share_token")
      .single();
    return created ? toRecord(created as Row) : SEED_RECORD;
  } catch {
    return SEED_RECORD;
  }
}

// Upsert the doc. `snapshot` appends an immutable version (manual save / restore).
export async function saveReport(args: { id: string | null; title: string; subtitle: string; doc: ReportDoc; snapshot?: boolean; label?: string }): Promise<{ ok: boolean; id: string | null }> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, id: args.id };
  try {
    let id = args.id;
    const docJson = args.doc as unknown as Json;
    if (id) {
      await admin.from("reports").update({ title: args.title, subtitle: args.subtitle, doc: docJson, updated_at: new Date().toISOString() }).eq("id", id);
    } else {
      const { data } = await admin.from("reports").insert({ title: args.title, subtitle: args.subtitle, doc: docJson }).select("id").single();
      id = data?.id ?? null;
    }
    if (args.snapshot && id) {
      await admin.from("report_versions").insert({ report_id: id, doc: docJson, label: args.label ?? null });
    }
    return { ok: true, id };
  } catch {
    return { ok: false, id: args.id };
  }
}

export async function listVersions(reportId: string): Promise<ReportVersion[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  try {
    const { data } = await admin.from("report_versions").select("id, label, created_at").eq("report_id", reportId).order("created_at", { ascending: false }).limit(30);
    return (data ?? []).map((v) => ({ id: v.id, label: v.label, createdAt: v.created_at }));
  } catch {
    return [];
  }
}

// Restore a version into the live doc, snapshotting the restore for an audit trail.
export async function restoreVersion(reportId: string, versionId: string): Promise<ReportDoc | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  try {
    const { data: v } = await admin.from("report_versions").select("doc").eq("id", versionId).eq("report_id", reportId).maybeSingle();
    if (!v) return null;
    const doc = v.doc as unknown as ReportDoc;
    await admin.from("reports").update({ doc: v.doc, updated_at: new Date().toISOString() }).eq("id", reportId);
    await admin.from("report_versions").insert({ report_id: reportId, doc: v.doc, label: "Restaurada" });
    return doc;
  } catch {
    return null;
  }
}

// Publish (or re-fetch) the read-only share token.
export async function publishReport(reportId: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  try {
    const { data: existing } = await admin.from("reports").select("share_token, is_public").eq("id", reportId).maybeSingle();
    if (existing?.share_token && existing.is_public) return existing.share_token;
    const token = randomUUID().replace(/-/g, "").slice(0, 16);
    const { error } = await admin.from("reports").update({ share_token: token, is_public: true, updated_at: new Date().toISOString() }).eq("id", reportId);
    return error ? null : token;
  } catch {
    return null;
  }
}

// Read a published report by share token (public, read-only). null → 404.
export async function getPublicReport(token: string): Promise<ReportRecord | null> {
  if (!token) return null;
  try {
    const client = createAdminClient() ?? (await createClient());
    const { data } = await client.from("reports").select("id, title, subtitle, doc, is_public, share_token").eq("share_token", token).eq("is_public", true).maybeSingle();
    return data ? toRecord(data as Row) : null;
  } catch {
    return null;
  }
}
