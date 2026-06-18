// Async Apify run helper for ad-library scrapers.
//
// Ad-library scrapes routinely run for minutes and return large datasets, so the
// `run-sync-get-dataset-items` endpoint (capped, synchronous) is the wrong tool:
// it times out and never reports the real cost. This helper instead:
//   1) starts the run (POST /acts/{actor}/runs),
//   2) polls the run until it reaches a terminal state OR an in-request deadline,
//   3) aborts on deadline so a slow run can't keep spending after we've left,
//   4) reads the dataset items AND the run's real `usageTotalUsd`.
// Transient start failures (429 / 5xx) get a bounded backoff retry; permanent
// errors (bad input / auth / unknown actor) fail fast so the caller can fall
// back to the declared fallback actor.
//
// NOTE: in-request polling still lives inside the serverless function's wall
// clock — long scrapes should move to a queue/worker (see docs/STATUS.md §9).

const APIFY_BASE = "https://api.apify.com/v2";

export type ApifyRunResult = {
  items: Record<string, unknown>[];
  costUsd: number;
  status: string;
};

type RunData = { id?: string; status?: string; defaultDatasetId?: string; usageTotalUsd?: number };

const TERMINAL = new Set(["SUCCEEDED", "FAILED", "ABORTED", "ABORTING", "TIMED-OUT", "TIMING-OUT"]);

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// 429 / 5xx are worth retrying; other 4xx are permanent (input/auth/actor).
function isTransientStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

class ApifyHttpError extends Error {
  transient: boolean;
  constructor(message: string, transient: boolean) {
    super(message);
    this.transient = transient;
  }
}

async function startRun(actor: string, token: string, input: Record<string, unknown>): Promise<{ runId: string; datasetId: string }> {
  const res = await fetch(`${APIFY_BASE}/acts/${actor}/runs?token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApifyHttpError(`Apify start ${res.status} — ${body.slice(0, 200)}`, isTransientStatus(res.status));
  }
  const j = (await res.json()) as { data?: RunData };
  const runId = j.data?.id;
  const datasetId = j.data?.defaultDatasetId;
  if (!runId || !datasetId) throw new ApifyHttpError("Apify start: respuesta sin runId/datasetId", false);
  return { runId, datasetId };
}

async function getRunData(runId: string, token: string): Promise<RunData | undefined> {
  const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${token}`, { headers: { Accept: "application/json" } });
  if (!res.ok) return undefined;
  const j = (await res.json()) as { data?: RunData };
  return j.data;
}

async function getDatasetItems(datasetId: string, token: string, limit: number): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${APIFY_BASE}/datasets/${datasetId}/items?token=${token}&clean=true&limit=${limit}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  const j = await res.json().catch(() => null);
  return Array.isArray(j) ? (j as Record<string, unknown>[]) : [];
}

async function abortRun(runId: string, token: string): Promise<void> {
  await fetch(`${APIFY_BASE}/actor-runs/${runId}/abort?token=${token}`, { method: "POST" }).catch(() => {});
}

export async function runApifyActor(opts: {
  actor: string;
  token: string;
  input: Record<string, unknown>;
  limit: number;
  deadlineMs?: number;
  pollMs?: number;
  maxStartRetries?: number;
}): Promise<ApifyRunResult> {
  const deadline = Date.now() + (opts.deadlineMs ?? 90_000);
  const maxStartRetries = opts.maxStartRetries ?? 2;

  // Start with bounded backoff on transient failures only.
  let started: { runId: string; datasetId: string } | undefined;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxStartRetries; attempt++) {
    try {
      started = await startRun(opts.actor, opts.token, opts.input);
      break;
    } catch (e) {
      lastErr = e;
      const transient = e instanceof ApifyHttpError ? e.transient : true;
      if (!transient || attempt === maxStartRetries) throw e;
      await sleep(1000 * 2 ** attempt); // 1s, 2s, …
    }
  }
  if (!started) throw lastErr instanceof Error ? lastErr : new Error("Apify start falló");
  const { runId, datasetId } = started;

  // Poll until terminal or deadline (abort on deadline to cap spend).
  let data = await getRunData(runId, opts.token);
  let pollInterval = opts.pollMs ?? 2500;
  while (data?.status && !TERMINAL.has(data.status)) {
    if (Date.now() >= deadline) {
      await abortRun(runId, opts.token);
      data = await getRunData(runId, opts.token);
      break;
    }
    await sleep(Math.min(pollInterval, Math.max(250, deadline - Date.now())));
    pollInterval = Math.min(Math.round(pollInterval * 1.4), 10_000);
    data = await getRunData(runId, opts.token);
  }

  // A hard FAILED (bad input / actor error) → throw so the caller can fall back.
  // ABORTED / TIMED-OUT still return whatever partial data was pushed.
  if (data?.status === "FAILED") {
    throw new Error(`Apify run FAILED (actor ${opts.actor})`);
  }

  const items = await getDatasetItems(datasetId, opts.token, opts.limit);
  const costUsd = typeof data?.usageTotalUsd === "number" ? data.usageTotalUsd : 0;
  return { items, costUsd, status: data?.status ?? "UNKNOWN" };
}
