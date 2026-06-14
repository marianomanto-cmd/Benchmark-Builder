import "server-only";
import { createClient } from "@/lib/supabase/server";
import { confLabel, sparkFor, type OverviewData, type MentionVM, type AnalysisVM } from "@/lib/view-models";
import { DEMO_RUNS, DEMO_PROJECT_SLUG, DEMO_PROJECTS } from "@/lib/demo";
import { getCase } from "@/lib/demo-cases";
import { relativeTime } from "@/lib/sources/types";
import type { PlatformKey, SentimentKind, ThumbKind } from "@/lib/platforms";

type RunRow = { number: number; mentions: number; cost: number; when: string; title?: string; slug?: string };

async function projectId(slug: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("id").eq("slug", slug).maybeSingle();
  return data?.id ?? null;
}

// Overview: competitor strip + highlighted insights + current run cost.
// Falls back to the matching demo case (by slug) if Supabase isn't reachable/seeded.
export async function getOverviewData(slug: string = DEMO_PROJECT_SLUG): Promise<OverviewData> {
  const fallback = (): OverviewData => {
    const c = getCase(slug);
    return { competitors: c.competitors, insights: c.insights, run: c.run };
  };
  try {
    const supabase = await createClient();
    const pid = await projectId(slug);
    if (!pid) return fallback();

    const [{ data: competitors }, { data: insights }, { data: run }] = await Promise.all([
      supabase
        .from("competitors")
        .select("*, competitor_platforms(platform, sort_order)")
        .eq("project_id", pid)
        .order("sort_order"),
      supabase.from("insights").select("*").eq("project_id", pid).order("sort_order"),
      supabase.from("runs").select("*").eq("project_id", pid).order("number", { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (!competitors || competitors.length === 0) return fallback();

    return {
      competitors: competitors.map((c) => ({
        name: c.name,
        handle: c.handle,
        brandLetter: c.brand_letter,
        accent: c.accent,
        isClient: c.is_client,
        platforms: (c.competitor_platforms ?? [])
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((p) => p.platform as PlatformKey),
        mentions: String(c.mentions),
        sov: c.sov.toFixed(1).replace(".", ","),
        sentiment: c.sentiment as SentimentKind,
        sparkData: sparkFor(c.sort_order),
      })),
      insights: (insights ?? []).map((i) => ({
        kind: i.kind,
        title: i.title,
        sources: i.sources,
        confidence: confLabel(i.confidence),
      })),
      run: run
        ? { number: run.number, used: Number(run.cost_used), soft: Number(run.cost_soft), hard: Number(run.cost_hard) }
        : fallback().run,
    };
  } catch {
    return fallback();
  }
}

// Per-case header bits (breadcrumb, hero, KPIs, run number). Demo-only for now.
export async function getCaseHeader(slug: string = DEMO_PROJECT_SLUG) {
  const c = getCase(slug);
  return { crumb: c.crumb, project: c.project, runNumber: c.runNumber, hero: c.hero, kpis: c.kpis, run: c.run };
}

// Side-by-side comparativa matrix for a case.
export async function getComparativa(slug: string = DEMO_PROJECT_SLUG) {
  return getCase(slug).comparativa;
}

// Gallery (organic vs paid) for a case.
export async function getGallery(slug: string = DEMO_PROJECT_SLUG) {
  return getCase(slug).gallery;
}

// FODA / action matrix / roadmap for a case.
export async function getSwotData(slug: string = DEMO_PROJECT_SLUG) {
  return getCase(slug).swot;
}

// Live feed mentions.
export async function getMentions(slug: string = DEMO_PROJECT_SLUG): Promise<MentionVM[]> {
  try {
    const supabase = await createClient();
    const pid = await projectId(slug);
    if (!pid) return getCase(slug).mentions;

    const { data } = await supabase.from("mentions").select("*").eq("project_id", pid).order("sort_order");
    if (!data || data.length === 0) return getCase(slug).mentions;

    return data.map((m) => ({
      platform: m.platform as PlatformKey,
      author: m.author,
      handle: m.handle,
      ts: m.ts_label,
      brand: m.brand,
      body: m.body,
      sentiment: m.sentiment as SentimentKind,
      isAd: m.is_ad,
      thumbType: (m.thumb_type ?? undefined) as ThumbKind | undefined,
      metrics: Array.isArray(m.metrics) ? (m.metrics as [string, string][]) : [],
    }));
  } catch {
    return getCase(slug).mentions;
  }
}

// Recent runs for the welcome portal.
export async function getRecentRuns(slug: string = DEMO_PROJECT_SLUG): Promise<RunRow[]> {
  try {
    const supabase = await createClient();
    const pid = await projectId(slug);
    if (!pid) return DEMO_RUNS;
    const { data } = await supabase
      .from("runs")
      .select("number, cost_used, mentions_count, created_at")
      .eq("project_id", pid)
      .order("number", { ascending: false })
      .limit(6);
    if (!data || data.length === 0) return DEMO_RUNS;
    return data.map((r) => ({
      number: r.number,
      mentions: r.mentions_count,
      cost: Number(r.cost_used),
      when: relativeTime(r.created_at),
      slug,
    }));
  } catch {
    return DEMO_RUNS;
  }
}

// Full run history for the /runs page.
export async function getRuns(slug: string = DEMO_PROJECT_SLUG, limit = 24): Promise<(RunRow & { status: string })[]> {
  const fallback = DEMO_RUNS.map((r) => ({ ...r, status: "done" }));
  try {
    const supabase = await createClient();
    const pid = await projectId(slug);
    if (!pid) return fallback;
    const { data } = await supabase
      .from("runs")
      .select("number, cost_used, mentions_count, created_at, status")
      .eq("project_id", pid)
      .order("number", { ascending: false })
      .limit(limit);
    if (!data || data.length === 0) return fallback;
    return data.map((r) => ({
      number: r.number,
      mentions: r.mentions_count,
      cost: Number(r.cost_used),
      when: relativeTime(r.created_at),
      status: r.status,
      slug,
    }));
  } catch {
    return fallback;
  }
}

// Projects = user-managed folders that group runs. Prefers the DB when it holds
// a real multi-project workspace; otherwise shows the demo directory.
export async function getProjects(): Promise<
  Array<{ slug: string; name: string; category: string; runs: number; lastRun: string; budget: number; accent: string }>
> {
  try {
    const supabase = await createClient();
    const { data: projects } = await supabase.from("projects").select("id, name, slug, budget_monthly_usd").order("created_at", { ascending: false });
    if (!projects || projects.length < 2) return DEMO_PROJECTS;
    const out: Array<{ slug: string; name: string; category: string; runs: number; lastRun: string; budget: number; accent: string }> = [];
    for (const p of projects) {
      const { count } = await supabase.from("runs").select("id", { count: "exact", head: true }).eq("project_id", p.id);
      const { data: last } = await supabase.from("runs").select("created_at").eq("project_id", p.id).order("number", { ascending: false }).limit(1).maybeSingle();
      out.push({ slug: p.slug, name: p.name, category: "Research", runs: count ?? 0, lastRun: last ? relativeTime(last.created_at) : "—", budget: Number(p.budget_monthly_usd), accent: "var(--series-client)" });
    }
    return out;
  } catch {
    return DEMO_PROJECTS;
  }
}

// Per-section analysis (hero block). Seeded demo content per case until a real
// run generates it.
export async function getSectionAnalysis(section: string, slug: string = DEMO_PROJECT_SLUG): Promise<AnalysisVM | null> {
  const fallback = getCase(slug).sections[section] ?? getCase(slug).analysis;
  try {
    const supabase = await createClient();
    const pid = await projectId(slug);
    if (!pid) return fallback;
    const { data } = await supabase
      .from("run_analysis")
      .select("headline, body, takeaways, recommendations")
      .eq("project_id", pid)
      .eq("section", section)
      .maybeSingle();
    if (!data) return fallback;
    return { headline: data.headline, body: data.body, takeaways: data.takeaways, recommendations: data.recommendations };
  } catch {
    return fallback;
  }
}
