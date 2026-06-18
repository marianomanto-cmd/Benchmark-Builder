import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sourceFor, metaAdsOfficial } from "@/lib/sources";
import { relativeTime, type RawMention, type SourceResult, type AdMeta } from "@/lib/sources/types";
import { queueRunMedia, processRunMedia } from "@/lib/media";
import { scoreSentiments, scoreToSentiment, generateInsights } from "@/lib/ai";
import { formatCompact } from "@/lib/format";
import { demoRawMentions, demoAdMentions, demoScores, demoInsightDrafts } from "@/lib/runner-fixtures";
import type { PlatformKey, SentimentKind } from "@/lib/platforms";
import { estimateRunCost, type RunPlan, type SourceProvider } from "@/lib/cost/estimate";
import { apifyCostUSD, grokSearchCostUSD, synthesisCostUSD, cents } from "@/lib/cost/rates";
import { guardedCall, type GuardReason } from "@/lib/cost/guarded";
import { releaseExpiredCharges } from "@/lib/cost/ledger";
import { LIMITS } from "@/lib/cost/config";
import { inferPlanHeuristic, type ResearchPlan } from "@/lib/discovery/schema";
import { planToJobs, type ExtractionJob, type SettingRow } from "@/lib/discovery/jobs";
import { planQueries, keywordsForJob, type ClientProfile } from "@/lib/discovery/planner";

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
  scope?: ResearchPlan["scope"];
  platforms?: { platform: PlatformKey; scope: string; status: string; count: number; error?: string }[];
};

export type RunOptions = { scope?: ResearchPlan["scope"]; adIntent?: ResearchPlan["ad_intent"]; plan?: ResearchPlan };

const FREE_NOKEY = new Set(["reddit", "mastodon", "bluesky"]);

// Paid ad scrapes run long (the async Apify helper polls for minutes), so their
// guarded call gets a bigger wall-clock budget than the default callTimeoutMs.
// The helper enforces its own deadline (APIFY_ADS_RUN_TIMEOUT_MS) inside this.
const PAID_CALL_TIMEOUT_MS = Number(process.env.APIFY_ADS_CALL_TIMEOUT_MS) > 0 ? Number(process.env.APIFY_ADS_CALL_TIMEOUT_MS) : 120_000;

// Estimated cost of a job by provider (apify per item, grok per search, free=0).
function jobCost(job: ExtractionJob): number {
  if (job.provider === "apify") return apifyCostUSD(job.items);
  if (job.provider === "grok") return grokSearchCostUSD(Math.max(1, Math.ceil(job.items / 25)));
  return 0; // reddit/mastodon/bluesky/meta_api
}

// Map a job provider to the estimate's SourceProvider bucket.
function estProvider(job: ExtractionJob): SourceProvider {
  if (job.provider === "apify") return "apify";
  if (job.provider === "grok") return "grok";
  return "free";
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

// Ad metrics surfaced on the card (spend / impressions when present).
function metricsFromAd(ad: NonNullable<RawMention["ad"]>): [string, string][] {
  const out: [string, string][] = [];
  if (ad.spendRange) out.push(["€", ad.spendRange]);
  if (ad.impressions) out.push(["👁", `est. ${ad.impressions}`]);
  if (!out.length && ad.cta) out.push(["▶", ad.cta]);
  return out.slice(0, 3);
}

const DOMINANT_FALLBACK: SentimentKind = "neu";
function dominant(counts: Record<SentimentKind, number>): SentimentKind {
  let best: SentimentKind = DOMINANT_FALLBACK;
  let max = -1;
  for (const [k, v] of Object.entries(counts) as [SentimentKind, number][]) {
    if (v > max) { max = v; best = k; }
  }
  return best;
}

// Executes a research run from a ResearchPlan (organic + paid jobs). Every paid
// (or simulated-paid) step goes through the cost engine. In mock mode connectors
// return deterministic fixtures with simulated cost → full validation at zero
// real cost. "Real" fires only when PIPELINE_MODE=live AND the provider flag is
// on AND the key is present (enforced in guardedCall).
export async function executeRun(
  slug?: string,
  platforms?: PlatformKey[],
  keywordOverride?: string[],
  opts: RunOptions = {},
): Promise<RunResult> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Falta SUPABASE_SERVICE_ROLE_KEY para escribir resultados." };

  const projectSlug = slug ?? "cartagena-q2-2026";
  const { data: project } = await admin.from("projects").select("*").eq("slug", projectSlug).maybeSingle();
  if (!project) return { ok: false, error: `Proyecto no encontrado: ${projectSlug}` };

  const { data: competitors } = await admin
    .from("competitors")
    .select("id, name, handle, targets, competitor_platforms(platform, advertiser_id)")
    .eq("project_id", project.id);
  const comps = competitors ?? [];

  // Resolve the plan to execute: explicit plan from the wizard, else derive one.
  const fromComps = Array.from(new Set(comps.flatMap((c) => (c.competitor_platforms ?? []).map((p) => p.platform as PlatformKey))));
  const keywords =
    keywordOverride && keywordOverride.length
      ? keywordOverride
      : project.keywords.length
        ? project.keywords
        : Array.from(new Set([project.name.split("·")[0].trim(), ...comps.map((c) => c.name)]));

  let plan: ResearchPlan;
  if (opts.plan) {
    plan = opts.plan;
  } else {
    const base = inferPlanHeuristic("");
    const targetPlatforms = platforms && platforms.length ? platforms : fromComps.length ? fromComps : base.platforms;
    plan = {
      ...base,
      client_brand: "",
      competitors: comps.map((c) => c.name),
      platforms: targetPlatforms,
      scope: opts.scope ?? "organic",
      ad_intent: opts.adIntent ?? "commercial",
    };
  }

  // Source registry (actor ids, provider, scope, enabled, limits) — editable in /settings.
  const { data: settingsRows } = await admin.from("source_settings").select("*");
  const settings = (settingsRows ?? []) as SettingRow[];
  const jobs = planToJobs(plan, settings, LIMITS.maxItemsPerSource);
  if (jobs.length === 0) return { ok: false, error: "El plan no produjo jobs (revisá fuentes habilitadas y scope)." };

  // Planner: interpret the case study into FOCUSED per-source queries (not the
  // raw prompt). Deterministic by default (zero cost); Claude refines in live.
  const profile: ClientProfile | undefined =
    plan.client_brand || plan.brand_desc
      ? {
          brand: plan.client_brand,
          brand_desc: plan.brand_desc,
          brand_site: plan.brand_site,
          brand_handles: plan.brand_handles,
          invest_organic: plan.invest_organic,
          invest_paid: plan.invest_paid,
          default_discards: plan.discards,
        }
      : undefined;
  const { spec: querySpec } = await planQueries(plan, { profile, intent: keywords.join(" ") });

  // Paid runs additionally analyze ad creatives (qué muestra / qué dice) with
  // vision. Estimate them as image-analysis calls so the estimate keeps bounding
  // the actual ledger; bounded by MAX_VIDEOS_PER_RUN, the same cap the media
  // pipeline enforces.
  const paidItems = jobs.filter((j) => j.scope === "paid").reduce((a, j) => a + j.items, 0);
  const estCreatives = Math.min(paidItems, LIMITS.maxVideosPerRun);

  // Estimate from the exact jobs we will run.
  const runPlan: RunPlan = {
    sources: jobs.map((j) => ({ platform: `${j.platform}:${j.scope}`, items: j.items, provider: estProvider(j) })),
    images: estCreatives,
    videos: 0,
    framesPerVideo: 0,
    avgVideoMinutes: 0,
    transcribeVideos: false,
    useWhisper: false,
    synthesisSections: 2,
  };
  const estimate = estimateRunCost(runPlan);

  // Create the run row.
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
      plan: plan as never,
      scope: plan.scope,
      ad_intent: plan.ad_intent,
    })
    .select("id")
    .single();
  if (runErr || !run) return { ok: false, error: `No se pudo crear el run: ${runErr?.message}` };
  const runId = run.id;

  await releaseExpiredCharges(admin);

  const collected: RawMention[] = [];
  const summary: NonNullable<RunResult["platforms"]> = [];
  let paused: GuardReason | undefined;

  const handlesForJob = (job: ExtractionJob): string[] => {
    if (job.scope === "organic") {
      return Array.from(
        new Set(
          comps
            .filter((c) => (c.competitor_platforms ?? []).some((p) => p.platform === job.platform))
            .flatMap((c) => [c.handle, ...(c.targets ?? [])]),
        ),
      );
    }
    // paid: ad libraries search by advertiser. One identifier per competitor (its
    // brand / page name) so each maps to a single, bounded Apify run.
    return Array.from(new Set(comps.map((c) => c.name || c.handle).filter(Boolean)));
  };

  // Cached numeric advertiser/page ids for this paid platform (warmed by prior
  // runs via the learn-back step below); preferred over names by the ad source.
  const advertiserIdsForJob = (job: ExtractionJob): string[] => {
    if (job.scope !== "paid") return [];
    return Array.from(
      new Set(
        comps.flatMap((c) =>
          (c.competitor_platforms ?? [])
            .filter((p) => p.platform === job.platform && p.advertiser_id)
            .map((p) => p.advertiser_id as string),
        ),
      ),
    );
  };

  const runJob = async (
    job: ExtractionJob,
    source: NonNullable<ReturnType<typeof sourceFor>>,
    label: string,
    fixture: () => RawMention[],
    providerOverride?: string,
  ): Promise<boolean> => {
    const est = jobCost(job);
    const jobKeywords = keywordsForJob(querySpec, job.platform, job.scope, keywords);
    const provider = providerOverride ?? job.provider;
    const advertiserIds = advertiserIdsForJob(job);

    const attempt = (actorId?: string) =>
      guardedCall<SourceResult>({
        admin,
        runId,
        provider,
        operation: `${job.scope}:${job.platform}`,
        label,
        estimatedCost: est,
        freeProvider: FREE_NOKEY.has(provider),
        timeoutMs: job.scope === "paid" ? PAID_CALL_TIMEOUT_MS : undefined,
        call: () =>
          source.fetch({
            platform: job.platform,
            scope: job.scope,
            handles: handlesForJob(job),
            keywords: jobKeywords,
            languages: project.languages,
            geo: project.geo,
            sinceDays: project.period_days,
            limit: job.items,
            actorId,
            advertiserIds,
            political: job.political,
          }),
        fixture: () => ({ mentions: fixture(), cost: est }),
        // Apify ad runs report real cost (usageTotalUsd); fall back to the
        // estimate when the API doesn't surface a figure.
        realCost: (r) => (r.cost && r.cost > 0 ? r.cost : est),
        mockCost: est,
      });

    let out = await attempt(job.actorId);
    // On a genuine call failure (not a pause / budget stop), retry once with the
    // declared fallback actor before degrading (schema-drift mitigation).
    if (!out.ok && out.reason === "call_failed" && job.fallbackActorId && job.fallbackActorId !== job.actorId) {
      out = await attempt(job.fallbackActorId);
    }
    if (!out.ok) {
      if (out.reason === "api_disabled" || out.reason === "budget_hard") {
        paused = out.reason;
        await admin.from("run_sources").insert({ run_id: runId, platform: job.platform, status: "skipped", error: out.reason });
        summary.push({ platform: job.platform, scope: job.scope, status: "paused", count: 0, error: out.reason });
        return false;
      }
      // call failed → fallback to declared fallback actor or mark degraded; never break the run.
      await admin.from("run_sources").insert({ run_id: runId, platform: job.platform, status: "degraded", error: out.message ?? out.reason });
      summary.push({ platform: job.platform, scope: job.scope, status: "degraded", count: 0, error: out.message ?? out.reason });
      return true;
    }
    for (const m of out.result.mentions) collected.push({ ...m, platform: job.platform });
    await admin.from("run_sources").insert({ run_id: runId, platform: job.platform, status: "done", mentions_count: out.result.mentions.length, cost: cents(out.cost) });
    summary.push({ platform: job.platform, scope: job.scope, status: out.mode, count: out.result.mentions.length });
    return true;
  };

  // ---- Extraction jobs (organic + paid) under the cost guard ------------------
  for (const job of jobs) {
    if (paused) break;
    const source = sourceFor(job.platform, job.scope);
    if (!source) {
      await admin.from("run_sources").insert({ run_id: runId, platform: job.platform, status: "skipped", error: "sin adaptador" });
      summary.push({ platform: job.platform, scope: job.scope, status: "skipped", count: 0, error: "sin adaptador" });
      continue;
    }
    const fixture = job.scope === "paid" ? () => demoAdMentions(job.platform) : () => demoRawMentions(job.platform);
    const ok = await runJob(job, source, `${job.scope === "paid" ? "Anuncios" : "Recolección"} · ${job.platform}`, fixture);
    if (!ok) break;

    // Political routing for Meta paid: additionally pull the official Ad Library
    // API (spend/impressions/funder) when intent is political.
    if (!paused && job.platform === "meta_ads" && job.scope === "paid" && job.political) {
      await runJob(
        { ...job, provider: "meta_api", actorId: undefined },
        metaAdsOfficial,
        "Anuncios · meta_ads (API oficial · político)",
        () => demoAdMentions("meta_ads"),
        "meta_api",
      );
    }
  }

  // ---- Competitor attribution (normalized + advertiser-id aware) -------------
  // Ad authors are page names that rarely match a competitor name verbatim, so a
  // strict equality check left most ads unattributed (competitor_id null → out of
  // SOV). Match by cached advertiser id first, then by normalized name/handle.
  const normKey = (s: string) => s.toLowerCase().replace(/^@/, "").replace(/[^a-z0-9]+/g, "");
  const byAdvertiserId = new Map<string, (typeof comps)[number]>();
  const compKeys: { key: string; comp: (typeof comps)[number] }[] = [];
  for (const c of comps) {
    for (const p of c.competitor_platforms ?? []) if (p.advertiser_id) byAdvertiserId.set(p.advertiser_id, c);
    for (const raw of [c.handle, c.name, ...(c.targets ?? [])]) {
      const k = normKey(raw ?? "");
      if (k.length >= 3) compKeys.push({ key: k, comp: c });
    }
  }
  const matchCompetitor = (m: RawMention): (typeof comps)[number] | undefined => {
    const advId = m.ad?.advertiserId || m.ad?.pageId;
    if (advId && byAdvertiserId.has(advId)) return byAdvertiserId.get(advId);
    const a = normKey(m.author);
    const h = normKey(m.handle);
    let hit = compKeys.find((x) => x.key === a || x.key === h);
    if (!hit) {
      hit = compKeys.find(
        (x) => (a && (a.includes(x.key) || x.key.includes(a))) || (h && (h.includes(x.key) || x.key.includes(h))),
      );
    }
    return hit?.comp;
  };

  // ---- Sentiment scoring (IA) under the guard --------------------------------
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
    else scores = demoScores(collected.map((m) => m.text));
  }

  // ---- Persist mentions (idempotent upsert) ----------------------------------
  const rows = collected.map((m, i) => {
    const comp = matchCompetitor(m);
    const engagement = { ...(m.engagement ?? {}), ...(m.ad ? { ad: m.ad } : {}) };
    const metrics = m.ad ? metricsFromAd(m.ad) : metricsFromEngagement(m.engagement);
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
      engagement: engagement as never,
      metrics: metrics as never,
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

  // ---- Learn-back: warm the advertiser-id cache for next runs -----------------
  // Once an ad is attributed to a competitor, persist its advertiser/page id so
  // future paid runs query by id (higher recall + precision) instead of name.
  const advLearn = new Map<string, { competitor_id: string; platform: PlatformKey; advertiser_id: string }>();
  for (const m of collected) {
    if (!m.isAd) continue;
    const advId = m.ad?.advertiserId || m.ad?.pageId;
    if (!advId) continue;
    const comp = matchCompetitor(m);
    if (!comp) continue;
    if ((comp.competitor_platforms ?? []).some((p) => p.platform === m.platform && p.advertiser_id === advId)) continue;
    advLearn.set(`${comp.id}:${m.platform}`, { competitor_id: comp.id, platform: m.platform, advertiser_id: advId });
  }
  if (advLearn.size) {
    await admin.from("competitor_platforms").upsert(Array.from(advLearn.values()), { onConflict: "competitor_id,platform" });
  }

  // ---- Ad creatives → media pipeline (qué muestra / qué dice) -----------------
  // Analyze the visual + voiceover of each scraped ad creative (the messaging /
  // offer / CTA), the highest-value signal in paid. Bounded by MAX_VIDEOS_PER_RUN
  // and mock-safe (download returns a marker; analysis falls back to fixtures).
  if (!paused && inserted > 0) {
    const { data: adRows } = await admin.from("mentions").select("id, engagement").eq("run_id", runId).eq("is_ad", true);
    const creatives = (adRows ?? [])
      .map((r) => {
        const ad = (r.engagement as { ad?: AdMeta } | null)?.ad;
        const url = ad?.creativeUrl;
        if (!url) return null;
        const isVideo = /\.(mp4|mov|webm|m3u8)(\?|$)/i.test(url) || (ad?.adType ?? "").toLowerCase().includes("video");
        return { mentionId: r.id as string, url, kind: (isVideo ? "video" : "image") as "image" | "video" };
      })
      .filter((x): x is { mentionId: string; url: string; kind: "image" | "video" } => x !== null);
    if (creatives.length) {
      await queueRunMedia(admin, project.id, runId, creatives);
      await processRunMedia(admin, runId);
    }
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

  // ---- Insights generation (IA) under the guard ------------------------------
  if (!paused && collected.length) {
    const byComp = comps
      .map((c) => {
        const n = collected.filter((m) => matchCompetitor(m)?.id === c.id).length;
        return `${c.name}: ${n} menciones`;
      })
      .join("; ");
    const samples = collected.slice(0, 30).map((m) => `[${m.platform}${m.isAd ? "·ad" : ""}] ${m.text.slice(0, 160)}`).join("\n");
    const out = await guardedCall<{ kind: "opp" | "thr" | "pat" | "ano"; title: string; body: string; sources: number; confidence: number }[]>({
      admin,
      runId,
      provider: "claude",
      operation: "insights",
      label: "Generación de insights (IA)",
      estimatedCost: synthesisCostUSD(),
      call: () => generateInsights(`Proyecto: ${project.name}. Scope: ${plan.scope}/${plan.ad_intent}. Volumen: ${byComp}.\nMuestras:\n${samples}`),
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

  // ---- Finalize ---------------------------------------------------------------
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
    scope: plan.scope,
    platforms: summary,
  };
}
