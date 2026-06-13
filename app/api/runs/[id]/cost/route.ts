import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// GET /api/runs/[id]/cost — live cost snapshot for the CostMeter.
// Returns: { status, estimated:{low,high}, spent_so_far, remaining,
//            breakdown_por_provider, steps[] }
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "service role no configurado" }, { status: 500 });

  const { data: run } = await admin
    .from("runs")
    .select("id, status, budget_usd, cost_estimated_low, cost_estimated_high, cost_actual, mentions_count")
    .eq("id", id)
    .maybeSingle();
  if (!run) return NextResponse.json({ ok: false, error: "run no encontrado" }, { status: 404 });

  const [{ data: ledger }, { data: steps }] = await Promise.all([
    admin.from("cost_ledger").select("provider, cost_usd").eq("run_id", id),
    admin
      .from("run_steps")
      .select("label, provider, cost_usd, cumulative_usd, metadata, created_at")
      .eq("run_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const spent = Math.round((ledger ?? []).reduce((a, r) => a + (r.cost_usd ?? 0), 0) * 100) / 100;
  const byProvider: Record<string, number> = {};
  for (const r of ledger ?? []) byProvider[r.provider] = Math.round(((byProvider[r.provider] ?? 0) + (r.cost_usd ?? 0)) * 100) / 100;

  const budget = run.budget_usd ?? 30;

  return NextResponse.json({
    ok: true,
    status: run.status,
    budget_usd: budget,
    estimated: { low: run.cost_estimated_low, high: run.cost_estimated_high },
    spent_so_far: spent,
    remaining: Math.round((budget - spent) * 100) / 100,
    breakdown_por_provider: byProvider,
    steps: steps ?? [],
  });
}
