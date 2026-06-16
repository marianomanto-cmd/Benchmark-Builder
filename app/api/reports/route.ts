import { NextResponse } from "next/server";
import { getOrCreateReport, saveReport, listVersions, restoreVersion, publishReport } from "@/lib/reports";
import type { ReportDoc } from "@/lib/report-doc";

export const runtime = "nodejs";

// Report persistence for the editor. Writes use the service role (no real auth
// yet — the "owner edits" boundary is a TODO in the migration). If Supabase isn't
// configured the data layer returns the seed and saves are best-effort no-ops, so
// the editor degrades to its localStorage cache.

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("case") ?? undefined;
  const report = await getOrCreateReport(slug);
  const versions = report.id ? await listVersions(report.id) : [];
  return NextResponse.json({ ok: true, report, versions });
}

type Body = {
  action?: "save" | "snapshot" | "publish" | "restore";
  id?: string | null;
  title?: string;
  subtitle?: string;
  doc?: ReportDoc;
  label?: string;
  versionId?: string;
};

export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    // ignore
  }
  const { action, id = null } = body;

  if (action === "publish") {
    if (!id) return NextResponse.json({ ok: false, error: "guardá el reporte primero" }, { status: 400 });
    const token = await publishReport(id);
    return token ? NextResponse.json({ ok: true, token }) : NextResponse.json({ ok: false, error: "no se pudo publicar" }, { status: 400 });
  }

  if (action === "restore") {
    if (!id || !body.versionId) return NextResponse.json({ ok: false, error: "faltan datos" }, { status: 400 });
    const doc = await restoreVersion(id, body.versionId);
    if (!doc) return NextResponse.json({ ok: false, error: "versión no encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true, doc, versions: await listVersions(id) });
  }

  // save | snapshot
  if (!body.doc) return NextResponse.json({ ok: false, error: "sin doc" }, { status: 400 });
  const res = await saveReport({
    id,
    title: body.title ?? "",
    subtitle: body.subtitle ?? "",
    doc: body.doc,
    snapshot: action === "snapshot",
    label: body.label,
  });
  const versions = action === "snapshot" && res.id ? await listVersions(res.id) : undefined;
  return NextResponse.json({ ok: res.ok, id: res.id, versions });
}
