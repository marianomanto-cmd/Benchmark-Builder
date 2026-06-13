import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { isApiEnabled, reserveBudget, commitCharge, releaseCharge, recordStep } from "./ledger";
import { pipelineMode, hasProviderKey, LIMITS } from "./config";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

export type GuardReason = "api_disabled" | "budget_hard" | "reserve_error" | "call_failed";

export type GuardOutcome<T> =
  | { ok: true; result: T; cost: number; mode: "live" | "mock"; soft: boolean; reservationId: string | null }
  | { ok: false; reason: GuardReason; message?: string; cost: 0 };

export type GuardedCall<T> = {
  admin: Admin;
  runId: string;
  provider: string;
  operation: string;
  label: string;
  estimatedCost: number;
  // Real (paid) call — invoked ONLY when mode=live && flag on && key present.
  call: () => Promise<T>;
  // Deterministic fixture used in mock mode or when no key is present.
  fixture: () => T | Promise<T>;
  // Measured cost of the real call; defaults to the estimate.
  realCost?: (result: T) => number;
  // Simulated cost booked in mock mode; defaults to the estimate.
  mockCost?: number;
  // Free APIs (reddit, bluesky, meta_ads…) carry no per-call cost and need no
  // key, so in live mode they run without the API-key condition.
  freeProvider?: boolean;
  timeoutMs?: number;
  maxRetries?: number;
  expiresMinutes?: number;
};

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

// Every paid (or simulated-paid) operation goes through here. Order:
//   1) kill switch / flag check — off → pause, no reservation, no loop.
//   2) reserve budget — hard cap → pause (circuit breaker); error → abort step.
//   3) live? (mode=live && key present) → real call with timeout + bounded
//      retries; otherwise → deterministic fixture (no paid call).
//   4) commit the real/simulated cost and append a timeline step.
// Retries are bounded (terminal at maxRetries) — never recurses.
export async function guardedCall<T>(opts: GuardedCall<T>): Promise<GuardOutcome<T>> {
  const { admin, runId, provider, operation, label } = opts;

  // 1) Kill switch (master + provider flag). Checked every call so flipping it
  //    mid-run stops the next operation within one step (test: stop in <60s).
  if (!(await isApiEnabled(admin, provider))) {
    await recordStep(admin, { runId, label: `${label} · pausado (APIs deshabilitadas)`, provider, cost: 0 });
    return { ok: false, reason: "api_disabled", cost: 0 };
  }

  // 2) Reserve.
  const reservation = await reserveBudget(admin, { runId, provider, operation, estimated: opts.estimatedCost, expiresMinutes: opts.expiresMinutes });
  if (reservation.status === "hard") {
    await recordStep(admin, {
      runId,
      label: `${label} · presupuesto excedido${reservation.scope ? ` (${reservation.scope})` : ""}`,
      provider,
      cost: 0,
      metadata: { cap: reservation.cap, spent: reservation.spent },
    });
    return { ok: false, reason: "budget_hard", message: reservation.message, cost: 0 };
  }
  if (reservation.status === "error" || !reservation.reservation_id) {
    await recordStep(admin, { runId, label: `${label} · error de reserva`, provider, cost: 0 });
    return { ok: false, reason: "reserve_error", message: reservation.message, cost: 0 };
  }
  const reservationId = reservation.reservation_id;
  const soft = reservation.status === "soft";

  // 3) Decide whether this is a real call. (Flag already verified above.)
  //    Paid providers also require the API key; free providers do not.
  const live = pipelineMode() === "live" && (opts.freeProvider === true || hasProviderKey(provider));

  let result: T;
  let cost: number;

  if (live) {
    const timeoutMs = opts.timeoutMs ?? LIMITS.callTimeoutMs;
    const maxRetries = opts.maxRetries ?? LIMITS.maxRetriesPerCall;
    let lastErr: unknown;
    let got: T | undefined;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        got = await withTimeout(opts.call(), timeoutMs);
        lastErr = undefined;
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (lastErr !== undefined || got === undefined) {
      await releaseCharge(admin, reservationId);
      const message = lastErr instanceof Error ? lastErr.message : String(lastErr);
      await recordStep(admin, { runId, label: `${label} · fallo tras reintentos`, provider, cost: 0, metadata: { error: message } });
      return { ok: false, reason: "call_failed", message, cost: 0 };
    }
    result = got;
    cost = opts.realCost ? opts.realCost(result) : opts.estimatedCost;
  } else {
    // Mock / no-key path: fixtures, simulated cost. No paid call is made.
    result = await opts.fixture();
    cost = opts.mockCost ?? opts.estimatedCost;
  }

  // 4) Commit + timeline. commit_charge is idempotent on reservation_id.
  await commitCharge(admin, reservationId, cost);
  await recordStep(admin, {
    runId,
    label: soft ? `${label} · ⚠ cerca del tope` : label,
    provider,
    cost,
    metadata: { mode: live ? "live" : "mock", operation },
  });

  return { ok: true, result, cost, mode: live ? "live" : "mock", soft, reservationId };
}
