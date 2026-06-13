import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

export type CostAlert = {
  level: "warn" | "critical";
  kind: "run_over" | "provider_daily" | "acceleration";
  message: string;
  value: number;
  threshold: number;
  scope?: string;
};

function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// Scans the cost_ledger for anomalies. Read-only — surfaces alerts for the UI /
// cron to act on; it does not itself pause anything (guardedCall enforces caps).
export async function checkCostAlerts(admin: Admin): Promise<CostAlert[]> {
  const alerts: CostAlert[] = [];
  const RUN_OVER = num("ALERT_RUN_OVER_USD", 50);
  const PROVIDER_DAILY = num("ALERT_PROVIDER_DAILY_USD", 100);
  const ACCEL = num("ALERT_ACCEL_FACTOR", 5);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: ledger, error } = await admin
    .from("cost_ledger")
    .select("run_id, provider, cost_usd, occurred_at")
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: true });
  if (error || !ledger) return alerts;

  // 1) Any single run over the per-run alert threshold (last 24h).
  const byRun = new Map<string, number>();
  for (const r of ledger) {
    if (!r.run_id) continue;
    byRun.set(r.run_id, (byRun.get(r.run_id) ?? 0) + (r.cost_usd ?? 0));
  }
  for (const [runId, total] of byRun) {
    if (total > RUN_OVER) {
      alerts.push({ level: "critical", kind: "run_over", scope: runId, value: Math.round(total * 100) / 100, threshold: RUN_OVER, message: `Run ${runId.slice(0, 8)} gastó USD ${total.toFixed(2)} (tope alerta USD ${RUN_OVER}).` });
    }
  }

  // 2) Any provider over the daily spend threshold.
  const byProvider = new Map<string, number>();
  for (const r of ledger) byProvider.set(r.provider, (byProvider.get(r.provider) ?? 0) + (r.cost_usd ?? 0));
  for (const [provider, total] of byProvider) {
    if (total > PROVIDER_DAILY) {
      alerts.push({ level: "critical", kind: "provider_daily", scope: provider, value: Math.round(total * 100) / 100, threshold: PROVIDER_DAILY, message: `${provider} gastó USD ${total.toFixed(2)} en 24h (tope USD ${PROVIDER_DAILY}).` });
    }
  }

  // 3) Anomalous acceleration: last hour vs. average of the prior 23 hours.
  const now = Date.now();
  const lastHour = ledger.filter((r) => new Date(r.occurred_at).getTime() >= now - 3600_000).reduce((a, r) => a + (r.cost_usd ?? 0), 0);
  const prior = ledger.filter((r) => new Date(r.occurred_at).getTime() < now - 3600_000).reduce((a, r) => a + (r.cost_usd ?? 0), 0);
  const priorHourlyAvg = prior / 23;
  if (priorHourlyAvg > 0.01 && lastHour > priorHourlyAvg * ACCEL) {
    alerts.push({ level: "warn", kind: "acceleration", value: Math.round((lastHour / priorHourlyAvg) * 10) / 10, threshold: ACCEL, message: `Gasto en la última hora ${(lastHour / priorHourlyAvg).toFixed(1)}× el promedio (USD ${lastHour.toFixed(2)} vs ${priorHourlyAvg.toFixed(2)}/h).` });
  }

  return alerts;
}
