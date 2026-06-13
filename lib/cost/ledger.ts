import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { cents } from "./rates";

// Service-role client handle (RLS-bypassing). Typed off the factory so the
// generated Database types flow through to .from()/.rpc().
type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

// system_flags key that gates each provider, on top of the master switch.
const PROVIDER_FLAG: Record<string, string> = {
  apify: "apify_enabled",
  anthropic: "anthropic_enabled",
  claude: "anthropic_enabled",
  claude_vision: "anthropic_enabled",
  claude_synthesis: "anthropic_enabled",
  openai: "openai_enabled",
  whisper: "openai_enabled",
  transcription: "openai_enabled",
  brave: "brave_enabled",
  grok: "xai_enabled",
  xai: "xai_enabled",
  x: "xai_enabled",
};

function flagOn(value: unknown): boolean {
  return value === true || value === "true";
}

// True only if the master switch AND the provider's own flag are enabled.
// On any read error we fail CLOSED (treat as disabled) — never spend on doubt.
export async function isApiEnabled(admin: Admin, provider: string): Promise<boolean> {
  const flagKey = PROVIDER_FLAG[provider];
  const keys = flagKey ? ["external_apis_enabled", flagKey] : ["external_apis_enabled"];
  const { data, error } = await admin.from("system_flags").select("key, value").in("key", keys);
  if (error || !data) return false;
  const map = new Map(data.map((r) => [r.key, r.value]));
  if (!flagOn(map.get("external_apis_enabled"))) return false;
  if (flagKey && !flagOn(map.get(flagKey))) return false;
  return true;
}

export type ReserveStatus = "ok" | "soft" | "hard" | "error";

export type ReserveResult = {
  status: ReserveStatus;
  reservation_id: string | null;
  // Diagnostic fields surfaced by the RPC (best-effort).
  spent?: number;
  estimated?: number;
  cap?: number;
  scope?: string;
  message?: string;
};

// Atomically reserve budget for an upcoming operation (FM-05: serialized per run
// via pg_advisory_xact_lock inside the RPC). Returns:
//   ok   → reserved, proceed
//   soft → reserved but ≥80% of a cap; proceed + warn
//   hard → would exceed a cap; NOT reserved, caller must pause (circuit breaker)
//   error→ RPC failed; caller must not spend
export async function reserveBudget(
  admin: Admin,
  args: { runId: string; provider: string; operation: string; estimated: number; expiresMinutes?: number },
): Promise<ReserveResult> {
  const { data, error } = await admin.rpc("reserve_budget", {
    p_run_id: args.runId,
    p_provider: args.provider,
    p_operation: args.operation,
    p_estimated: cents(args.estimated),
    p_expires_minutes: args.expiresMinutes ?? 15,
  });
  if (error || data == null) {
    return { status: "error", reservation_id: null, message: error?.message ?? "reserve_budget returned null" };
  }
  const obj = (typeof data === "object" ? data : {}) as Record<string, unknown>;
  const status = (obj.status as ReserveStatus) ?? "error";
  return {
    status,
    reservation_id: (obj.reservation_id as string) ?? null,
    spent: typeof obj.spent === "number" ? obj.spent : undefined,
    // The RPC reports the breached cap as `budget`; `reason` carries error notes.
    cap: typeof obj.budget === "number" ? obj.budget : undefined,
    scope: typeof obj.scope === "string" ? obj.scope : undefined,
    message: (typeof obj.message === "string" ? obj.message : typeof obj.reason === "string" ? obj.reason : undefined),
  };
}

// Finalize a reservation with the real cost (moves reserved → committed and
// writes the cost_ledger row inside the RPC). Idempotent on reservation_id.
export async function commitCharge(admin: Admin, reservationId: string, realCost: number): Promise<boolean> {
  const { error } = await admin.rpc("commit_charge", { p_reservation_id: reservationId, p_real: cents(realCost) });
  return !error;
}

// Release a reservation without charging (operation skipped/failed/mocked-free).
export async function releaseCharge(admin: Admin, reservationId: string): Promise<boolean> {
  const { error } = await admin.rpc("release_charge", { p_reservation_id: reservationId });
  return !error;
}

// Sweep reservations whose hold expired (cron / run start). Returns count freed.
export async function releaseExpiredCharges(admin: Admin): Promise<number> {
  const { data, error } = await admin.rpc("release_expired_charges", {});
  if (error || typeof data !== "number") return 0;
  return data;
}

// Append a timeline step for the live cost meter. cumulative_usd is computed
// from the prior step so the UI can render a running total without a sum query.
export async function recordStep(
  admin: Admin,
  args: { runId: string; label: string; provider?: string | null; cost: number; metadata?: Record<string, unknown> },
): Promise<void> {
  const { data: prev } = await admin
    .from("run_steps")
    .select("cumulative_usd")
    .eq("run_id", args.runId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const cumulative = cents((prev?.cumulative_usd ?? 0) + args.cost);
  await admin.from("run_steps").insert({
    run_id: args.runId,
    label: args.label,
    provider: args.provider ?? null,
    cost_usd: cents(args.cost),
    cumulative_usd: cumulative,
    metadata: (args.metadata ?? {}) as never,
  });
}
