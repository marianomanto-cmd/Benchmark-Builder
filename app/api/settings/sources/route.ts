import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlatformKey } from "@/lib/platforms";

export const runtime = "nodejs";

type Row = { platform: PlatformKey; scope?: string; provider?: string | null; actor_id: string | null; enabled: boolean; results_limit: number };

// POST /api/settings/sources — upsert source configuration (on/off, result limits).
// The capture method/actor is NOT user-managed: it's selected automatically per
// case study (see lib/sources/select-actor.ts), so the form sends actor_id: null.
export async function POST(req: Request) {
  const secret = process.env.RUN_TRIGGER_SECRET;
  if (secret && req.headers.get("x-run-secret") !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "Falta SUPABASE_SERVICE_ROLE_KEY" }, { status: 400 });

  let body: { rows?: Row[] } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    // ignore
  }
  const rows = body.rows ?? [];
  if (!rows.length) return NextResponse.json({ ok: false, error: "sin filas" }, { status: 400 });

  const { error } = await admin.from("source_settings").upsert(
    rows.map((r) => ({
      platform: r.platform,
      scope: r.scope === "paid" ? "paid" : "organic",
      provider: r.provider ?? null,
      actor_id: r.actor_id && r.actor_id.trim() ? r.actor_id.trim() : null,
      enabled: r.enabled,
      results_limit: Math.max(1, Math.min(200, Math.round(r.results_limit) || 25)),
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "platform,scope" },
  );
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
