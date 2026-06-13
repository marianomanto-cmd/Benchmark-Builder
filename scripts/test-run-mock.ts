/**
 * End-to-end mock-run validation (zero real cost).
 *
 *   npm run test:run-mock
 *
 * Requires SUPABASE service-role creds in .env.local (loaded via --env-file).
 * Forces PIPELINE_MODE=mock so no paid call is ever made. Asserts:
 *   (a) re-running does not duplicate mentions (idempotent upsert);
 *   (b) flipping external_apis_enabled=false pauses a run quickly with $0 spent;
 *   (c) the run's actual ledger total falls within the pre-run estimate band.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { executeRun } from "@/lib/runner";

process.env.PIPELINE_MODE = "mock";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`✗ ${msg}`);
    process.exitCode = 1;
    throw new Error(msg);
  }
  console.log(`✓ ${msg}`);
}

async function setFlag(admin: NonNullable<ReturnType<typeof createAdminClient>>, key: string, value: boolean) {
  await admin.from("system_flags").upsert({ key, value: value as never });
}

async function main() {
  const admin = createAdminClient();
  if (!admin) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL en .env.local");

  // Clean slate for flags.
  await setFlag(admin, "external_apis_enabled", true);

  // ---- (c) estimate band + first run --------------------------------------
  const r1 = await executeRun();
  assert(r1.ok, `run #${r1.number} completó (mock)`);
  assert(typeof r1.cost === "number", "run reportó costo");
  assert(
    r1.cost! >= (r1.estimateLow ?? 0) && r1.cost! <= (r1.estimateHigh ?? Infinity),
    `costo real ${r1.cost} dentro de la banda [${r1.estimateLow}, ${r1.estimateHigh}]`,
  );

  // Ledger total for the run must equal the reported cost.
  const { data: led1 } = await admin.from("cost_ledger").select("cost_usd").eq("run_id", r1.runId!);
  const ledTotal = Math.round((led1 ?? []).reduce((a, r) => a + (r.cost_usd ?? 0), 0) * 100) / 100;
  assert(Math.abs(ledTotal - r1.cost!) < 0.01, `cost_ledger total (${ledTotal}) == costo del run (${r1.cost})`);

  // ---- (a) idempotency: second run, no duplicate mentions -----------------
  const { count: before } = await admin.from("mentions").select("id", { count: "exact", head: true });
  const r2 = await executeRun();
  assert(r2.ok, `re-run #${r2.number} completó`);
  const { count: after } = await admin.from("mentions").select("id", { count: "exact", head: true });
  assert(before === after, `mentions no se duplicaron (${before} → ${after})`);

  // ---- (b) kill switch pauses fast with $0 spent --------------------------
  await setFlag(admin, "external_apis_enabled", false);
  const t0 = Date.now();
  const r3 = await executeRun();
  const elapsed = (Date.now() - t0) / 1000;
  await setFlag(admin, "external_apis_enabled", true); // restore
  assert(r3.paused === "api_disabled", `kill switch pausó el run (${r3.paused})`);
  assert(elapsed < 60, `pausó en < 60s (${elapsed.toFixed(1)}s)`);
  assert((r3.cost ?? 0) === 0, `costo del run pausado = $0 (${r3.cost})`);

  console.log("\n✓ todas las validaciones pasaron");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
