import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sourceFor } from "@/lib/sources";
import { relativeTime, type RawMention, type SourceResult } from "@/lib/sources/types";
import { scoreSentiments, scoreToSentiment, generateInsights } from "@/lib/ai";
import { formatCompact } from "@/lib/format";
import { demoRawMentions, demoScores, demoInsightDrafts } from "@/lib/runner-fixtures";
import type { PlatformKey, SentimentKind } from "@/lib/platforms";
import { estimateRunCost, type RunPlan, type SourceProvider } from "@/lib/cost/estimate";
import { apifyCostUSD, grokSearchCostUSD, synthesisCostUSD, cents } from "@/lib/cost/rates";
import { guardedCall, type GuardReason } from "@/lib/cost/guarded";
import { releaseExpiredCharges } from "@/lib/cost/ledger";
import { LIMITS } from "@/lib/cost/config";

export type RunResult = {
  ok: boolean;
  error?: string;
  runId?: string;
  number?: number;
  mentionsCount?: number;
  cost?: number;
  estimateLow?: number;
  estimateHigh?: number;
  paused?: GuardReason;
  platforms?: { platform: PlatformKey; status: string; count: number; error?: string }[];
};

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

// Which provider backs each platform — drives cost line, kill-switch flag and
// whether an API key is required (free providers need none).
const SOURCE_PROVIDER: Record<PlatformKey, SourceProvider> = {
  instagram: "apify",
  tiktok: "apify",
  youtube: "apify",
  facebook: "apify",
  web: "apify",
  x: "grok",
  meta_ads: "meta_ads",
  reddit: "reddit",
  mastodon: "mastodon",
  bluesky: "bluesky",
};

const FREE_PROVIDERS = new Set<SourceProvider>(["reddit", "mastodon", "bluesky", "meta_ads", "free"]);

// guardedCall provider string (what the ledger/flags key on) for a source.
function ledgerProvider(p: SourceProvider): string {
  return p === "apify" ? "apify" : p === "grok" ? "grok" : p;
}

function sourceCost(provider: SourceProvider, items: number): number {
  if (provider === "apify") return apifyCostUSD(items);
  if (provider === "grok") return grokSearchCostUSD(Math.max(1, Math.ceil(items / 25)));
  return 0; // free APIs
}

function metricsFromEngagement(e: RawMention["engagement"]): [string, string][] {
  if (!e) return [];
  const out: [string, string][] = [];
  if (e.views != null) out.push(["▷", formatCompact(e.views)]);
  if (e.likes != null) out.push(["♡", formatCompact(e.likes)]);
  if (e.comments != null) out.push(["💬", formatCompact(e.comments)]);
  if (e.shares != null) out.push(["↗", formatCompact(e.shares)]);
  return out.slice(0, 3);
}

const DOMINANT_FALLBACK: SentimentKind = "neu";

function dominant(counts: Record<SentimentKind, number>): SentimentKind {
  const entries = Object.entries(counts) as [SentimentKind, number][];
  let best: SentimentKind = DOMINANT_FALLBACK;
  let max = -1;
  for (const [k, v] of entries) {
    if (v > max) {
      max = v;
      best = k;
    }
  }
  return best;
}

// Executes a research run. Every paid (or simulated-paid) step goes through the
// cost engine: reserve → call/fixture → commit, writing run_steps + cost_ledger.
// In mock mode (PIPELINE_MODE!=="live") connectors and AI return deterministic
// fixtures with simulated costs, so the full flow validates at zero real cost.
// "Real" fires only when PIPELINE_MODE=live AND the provider flag is on AND the
// API key is present — enforced inside guardedCall.
export async function executeRun(slug?: string, platforms?: PlatformKey[], keywordOverride?: string[]): Promise<RunResult> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Falta SUPABASE_SERVICE_ROLE_KEY para escribir resultados." };

  const projectSlug = slug ?? "cartagena-q2-2026";
  const { data: project } = await admin.from("projects").select("*").eq("slug", projectSlug).maybeSingle();
  if (!project) return { ok: false, error: `Proyecto no encontrado: ${projectSlug}` };

  const { data: competitors } = await admin
    .from("competitors")
    .select("id, name, handle, targets, competitor_platforms(platform)")
    .eq("project_id", project.id);
  const comps = competitors ?? [];

  // Resolve target platforms.
  const fromComps = Array.from(
    new Set(comps.flatMap((c) => (c.competitor_platforms ?? []).map((p) => p.platform as PlatformKey))),
  );
  const targets = platforms && platforms.length ? platforms : fromComps.length ? fromComps : (Object.keys(SOURCE_PROVIDER) as PlatformKey[]);

  const keywords =
    keywordOverride && keywordOverride.length
      ? keywordOverride
      : project.keywords.length
        ? project.keywords
        : Array.from(new Set([project.name.split("·")[0].trim(), ...comps.map((c) => c.name)]));

  // Source config (Apify actor ids, enabled, limits) — editable from the app.
  const { data: settingsRows } = await admin.from("source_settings").select("*");
  const settings = new Map((settingsRows ?? []).map((s) => [s.platform as PlatformKey, s]));

  // Build the plan we are about to execute (sources + the AI synthesis calls:
  // one sentiment pass + one insights pass). The estimate is computed from this
  // exact plan so test:run-mock can assert ledger total ≈ estimate.
  const planSources = targets
    .filter((p) => settings.get(p)?.enabled !== false)
    .map((p) => {
      const provider = SOURCE_PROVIDER[p];
      const items = Math.min(settings.get(p)?.results_limit ?? 25, LIMITS.maxItemsPerSource);
      return { platform: p, items, provider };
    });
  const plan: RunPlan = {
    sources: planSources,
    images: 0,
    videos: 0,
    framesPerVideo: 0,
    avgVideoMinutes: 0,
    transcribeVideos: false,
    useWhisper: false,
    synthesisSections: 2, // sentiment + insights
  };
  const estimate = estimateRunCost(plan);

  // Create the run row with the budget band recorded.
  const { data: last } = await admin
    .from("runs")
    .select("number")
    .eq("project_id", project.id)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const number = (last?.number ?? 0) + 1;
  const { data: run, error: runErr } = await admin
    .from("runs")
    .insert({
      project_id: project.id,
      number,
      status: "running",
      started_at: new Date().toISOString(),
      cost_estimated_low: estimate.total_low,
      cost_estimated_high: estimate.total_high,
    })
    .select("id")
    .single();
  if (runErr || !run) return { ok: false, error: `No se pudo crear el run: ${runErr?.message}` };
  const runId = run.id;

  // Free any reservations left dangling by a previous interrupted run.
  await releaseExpiredCharges(admin);

  const collected: RawMention[] = [];
  const summary: NonNullable<RunResult["platforms"]> = [];
  let paused: GuardReason | undefined;

  // ---- Scrape each source under the cost guard --------------------------------
  for (const s of planSources) {
    if (paused) break;
    const provider = SOURCE_PROVIDER[s.platform];
    const source = sourceFor(s.platform);
    const handles = Array.from(
      new Set(
        comps
          .filter((c) => (c.competitor_platforms ?? []).some((p) => p.platform === s.platform))
          .flatMap((c) => [c.handle, ...(c.targets ?? [])]),
      ),
    );
    const cfg = settings.get(s.platform);
    const est = sourceCost(provider, s.items);

    const out = await guardedCall<SourceResult>({
      admin,
      runId,
      provider: ledgerProvider(provider),
      operation: `scrape:${s.platform}`,
      label: `Recolección · ${s.platform}`,
      estimatedCost: est,
      freeProvider: FREE_PROVIDERS.has(provider),
      call: () =>
        source.fetch({
          platform: s.platform,
          handles,
          keywords,
          languages: project.languages,
          geo: project.geo,
          sinceDays: project.period_days,
          limit: s.items,
          actorId: cfg?.actor_id ?? undefined,
        }),
      fixture: () => ({ mentions: demoRawMentions(s.platform), cost: est }),
      realCost: (r) => r.cost,
      mockCost: est,
    });

    if (!out.ok) {
      if (out.reason === "api_disabled" || out.reason === "budget_hard") {
        paused = out.reason;
        await admin.from("run_sources").insert({ run_id: runId, platform: s.platform, status: "skipped", error: out.reason });
        summary.push({ platform: s.platform, status: "paused", count: 0, error: out.reason });
        break;
      }
      await admin.from("run_sources").insert({ run_id: runId, platform: s.platform, status: "error", error: out.message ?? out.reason });
      summary.push({ platform: s.platform, status: "error", count: 0, error: out.message ?? out.reason });
      continue;
    }

    for (const m of out.result.mentions) collected.push({ ...m, platform: s.platform });
    await admin
      .from("run_sources")
      .insert({ run_id: runId, platform: s.platform, status: "done", mentions_count: out.result.mentions.length, cost: cents(out.cost) });
    summary.push({ platform: s.platform, status: out.mode, count: out.result.mentions.length });
  }

  // ---- Sentiment scoring under the cost guard ---------------------------------
  let scores: number[] = [];
  if (!paused && collected.length) {
    const out = await guardedCall<number[]>({
      admin,
      runId,
      provider: "claude",
      operation: "sentiment",
      label: "Análisis de sentimiento (IA)",
      estimatedCost: synthesisCostUSD(),
      call: () => scoreSentiments(collected.map((m) => m.text)),
      fixture: () => demoScores(collected.map((m) => m.text)),
    });
    if (out.ok) scores = out.result;
    else if (out.reason === "api_disabled" || out.reason === "budget_hard") paused = out.reason;
    else scores = demoScores(collected.map((m) => m.text)); // soft-fail: keep going with neutral-ish
  }

  // ---- Persist mentions (idempotent upsert → re-runs don't duplicate) ---------
  const rows = collected.map((m, i) => {
    const comp = comps.find(
      (c) => m.handle.toLowerCase().includes(c.handle.toLowerCase()) || m.author.toLowerCase() === c.name.toLowerCase(),
    );
    return {
      project_id: project.id,
      run_id: runId,
      competitor_id: comp?.id ?? null,
      platform: m.platform,
      author: m.author,
      handle: m.handle.replace(/^@/, ""),
      ts_label: relativeTime(m.publishedAt),
      brand: comp?.name ?? m.author,
      body: m.text,
      sentiment: scoreToSentiment(scores[i] ?? 0.5),
      is_ad: m.isAd ?? false,
      thumb_type: m.thumbType ?? null,
      url: m.url ?? null,
      permalink: m.url ?? null,
      external_id: m.externalId,
      published_at: m.publishedAt ?? null,
      engagement: m.engagement ?? {},
      metrics: metricsFromEngagement(m.engagement),
      sort_order: i,
    };
  });

  let inserted = 0;
  if (rows.length) {
    const { error, count } = await admin
      .from("mentions")
      .upsert(rows, { onConflict: "project_id,platform,external_id", count: "exact" });
    if (!error) inserted = count ?? rows.length;
  }

  // ---- Recompute competitor aggregates ----------------------------------------
  const { data: allMentions } = await admin
    .from("mentions")
    .select("competitor_id, sentiment")
    .eq("project_id", project.id)
    .not("competitor_id", "is", null);
  const total = allMentions?.length ?? 0;
  if (total > 0) {
    for (const c of comps) {
      const mine = (allMentions ?? []).filter((m) => m.competitor_id === c.id);
      if (mine.length === 0) continue;
      const counts: Record<SentimentKind, number> = { pos: 0, neu: 0, neg: 0, mix: 0 };
      for (const m of mine) counts[m.sentiment as SentimentKind]++;
      await admin
        .from("competitors")
        .update({ mentions: mine.length, sov: Math.round((mine.length / total) * 1000) / 10, sentiment: dominant(counts) })
        .eq("id", c.id);
    }
  }

  // ---- Insights generation under the cost guard -------------------------------
  if (!paused && collected.length) {
    const byComp = comps
      .map((c) => {
        const n = collected.filter((m) => m.handle.toLowerCase().includes(c.handle.toLowerCase()) || m.author.toLowerCase() === c.name.toLowerCase()).length;
        return `${c.name}: ${n} menciones`;
      })
      .join("; ");
    const samples = collected.slice(0, 30).map((m) => `[${m.platform}] ${m.text.slice(0, 160)}`).join("\n");
    const out = await guardedCall<{ kind: "opp" | "thr" | "pat" | "ano"; title: string; body: string; sources: number; confidence: number }[]>({
      admin,
      runId,
      provider: "claude",
      operation: "insights",
      label: "Generación de insights (IA)",
      estimatedCost: synthesisCostUSD(),
      call: () => generateInsights(`Proyecto: ${project.name}. Volumen por competidor: ${byComp}.\nMuestras:\n${samples}`),
      fixture: () => demoInsightDrafts(),
    });
    const drafts = out.ok ? out.result : [];
    if (!out.ok && (out.reason === "api_disabled" || out.reason === "budget_hard")) paused = out.reason;
    if (drafts.length) {
      await admin.from("insights").delete().eq("project_id", project.id);
      await admin.from("insights").insert(
        drafts.map((d, i) => ({
          project_id: project.id,
          run_id: runId,
          kind: d.kind,
          title: d.title,
          body: d.body,
          sources: d.sources,
          confidence: Math.round(d.confidence * 100) / 100,
          sort_order: i,
        })),
      );
    }
  }

  // ---- Finalize: real cost from the ledger ------------------------------------
  const { data: ledgerRows } = await admin.from("cost_ledger").select("cost_usd").eq("run_id", runId);
  const costActual = cents((ledgerRows ?? []).reduce((a, r) => a + (r.cost_usd ?? 0), 0));

  await admin
    .from("runs")
    .update({
      status: paused ? "paused" : "done",
      finished_at: new Date().toISOString(),
      mentions_count: inserted,
      cost_used: costActual,
      cost_actual: costActual,
    })
    .eq("id", runId);

  return {
    ok: !paused,
    runId,
    number,
    mentionsCount: inserted,
    cost: costActual,
    estimateLow: estimate.total_low,
    estimateHigh: estimate.total_high,
    paused,
    platforms: summary,
  };
}

// Re-exported for the admin helper type used by callers.
export type { Admin };
