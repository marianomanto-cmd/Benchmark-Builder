import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sourceFor } from "@/lib/sources";
import { relativeTime, type RawMention } from "@/lib/sources/types";
import { scoreSentiments, scoreToSentiment, generateInsights } from "@/lib/ai";
import { formatCompact } from "@/lib/format";
import type { PlatformKey, SentimentKind } from "@/lib/platforms";

export type RunResult = {
  ok: boolean;
  error?: string;
  runId?: string;
  number?: number;
  mentionsCount?: number;
  cost?: number;
  platforms?: { platform: PlatformKey; status: string; count: number; error?: string }[];
};

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

// Executes a research run: scrape selected platforms, score sentiment with Grok,
// upsert mentions, recompute competitor aggregates, regenerate insights, record cost.
export async function executeRun(slug?: string, platforms?: PlatformKey[]): Promise<RunResult> {
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

  // Platforms to run.
  const fromComps = Array.from(
    new Set(comps.flatMap((c) => (c.competitor_platforms ?? []).map((p) => p.platform as PlatformKey))),
  );
  const targets = platforms && platforms.length ? platforms : fromComps;
  if (targets.length === 0) return { ok: false, error: "El proyecto no tiene plataformas configuradas." };

  const keywords = project.keywords.length
    ? project.keywords
    : Array.from(new Set([project.name.split("·")[0].trim(), ...comps.map((c) => c.name)]));

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
    .insert({ project_id: project.id, number, status: "running", started_at: new Date().toISOString() })
    .select("id")
    .single();
  if (runErr || !run) return { ok: false, error: `No se pudo crear el run: ${runErr?.message}` };

  // Source config (Apify actor ids, enabled, limits) — editable from the app.
  const { data: settingsRows } = await admin.from("source_settings").select("*");
  const settings = new Map((settingsRows ?? []).map((s) => [s.platform as PlatformKey, s]));

  // Scrape each platform.
  const collected: RawMention[] = [];
  const summary: RunResult["platforms"] = [];
  let totalCost = 0;

  for (const platform of targets) {
    const cfg = settings.get(platform);
    if (cfg?.enabled === false) {
      await admin.from("run_sources").insert({ run_id: run.id, platform, status: "skipped", error: "deshabilitada en settings" });
      summary.push({ platform, status: "skipped", count: 0, error: "deshabilitada" });
      continue;
    }
    const source = sourceFor(platform);
    const handles = Array.from(
      new Set(
        comps
          .filter((c) => (c.competitor_platforms ?? []).some((p) => p.platform === platform))
          .flatMap((c) => [c.handle, ...(c.targets ?? [])]),
      ),
    );
    if (!source.available()) {
      await admin.from("run_sources").insert({ run_id: run.id, platform, status: "skipped", error: "credenciales no configuradas" });
      summary.push({ platform, status: "skipped", count: 0, error: "credenciales no configuradas" });
      continue;
    }
    try {
      const result = await source.fetch({
        platform,
        handles,
        keywords,
        languages: project.languages,
        geo: project.geo,
        sinceDays: project.period_days,
        limit: cfg?.results_limit ?? 25,
        actorId: cfg?.actor_id ?? undefined,
      });
      for (const m of result.mentions) collected.push({ ...m, platform });
      totalCost += result.cost;
      await admin.from("run_sources").insert({ run_id: run.id, platform, status: "done", mentions_count: result.mentions.length, cost: result.cost });
      summary.push({ platform, status: "done", count: result.mentions.length });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await admin.from("run_sources").insert({ run_id: run.id, platform, status: "error", error: msg });
      summary.push({ platform, status: "error", count: 0, error: msg });
    }
  }

  // Sentiment scoring via Grok.
  const scores = await scoreSentiments(collected.map((m) => m.text));

  // Map to mention rows.
  const rows = collected.map((m, i) => {
    const comp = comps.find(
      (c) => m.handle.toLowerCase().includes(c.handle.toLowerCase()) || m.author.toLowerCase() === c.name.toLowerCase(),
    );
    return {
      project_id: project.id,
      run_id: run.id,
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

  // Recompute competitor aggregates from all project mentions.
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
        .update({
          mentions: mine.length,
          sov: Math.round((mine.length / total) * 1000) / 10,
          sentiment: dominant(counts),
        })
        .eq("id", c.id);
    }
  }

  // Regenerate insights (only if Grok produced any).
  if (collected.length) {
    const byComp = comps
      .map((c) => {
        const n = collected.filter((m) => m.handle.toLowerCase().includes(c.handle.toLowerCase()) || m.author.toLowerCase() === c.name.toLowerCase()).length;
        return `${c.name}: ${n} menciones`;
      })
      .join("; ");
    const samples = collected.slice(0, 30).map((m) => `[${m.platform}] ${m.text.slice(0, 160)}`).join("\n");
    const drafts = await generateInsights(`Proyecto: ${project.name}. Volumen por competidor: ${byComp}.\nMuestras:\n${samples}`);
    if (drafts.length) {
      await admin.from("insights").delete().eq("project_id", project.id);
      await admin.from("insights").insert(
        drafts.map((d, i) => ({
          project_id: project.id,
          run_id: run.id,
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

  await admin
    .from("runs")
    .update({ status: "done", finished_at: new Date().toISOString(), mentions_count: inserted, cost_used: Math.round(totalCost * 100) / 100 })
    .eq("id", run.id);

  return { ok: true, runId: run.id, number, mentionsCount: inserted, cost: totalCost, platforms: summary };
}
