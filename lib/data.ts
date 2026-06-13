import "server-only";
import { createClient } from "@/lib/supabase/server";
import { confLabel, sparkFor, type OverviewData, type MentionVM, type AnalysisVM } from "@/lib/view-models";
import { DEMO_OVERVIEW, DEMO_MENTIONS, DEMO_RUNS, DEMO_ANALYSIS, DEMO_PROJECT_SLUG } from "@/lib/demo";
import { relativeTime } from "@/lib/sources/types";
import type { PlatformKey, SentimentKind, ThumbKind } from "@/lib/platforms";

async function projectId(slug: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("id").eq("slug", slug).maybeSingle();
  return data?.id ?? null;
}

// Overview: competitor strip + highlighted insights + current run cost.
// Falls back to the demo case if Supabase isn't reachable or seeded.
export async function getOverviewData(slug: string = DEMO_PROJECT_SLUG): Promise<OverviewData> {
  try {
    const supabase = await createClient();
    const pid = await projectId(slug);
    if (!pid) return DEMO_OVERVIEW;

    const [{ data: competitors }, { data: insights }, { data: run }] = await Promise.all([
      supabase
        .from("competitors")
        .select("*, competitor_platforms(platform, sort_order)")
        .eq("project_id", pid)
        .order("sort_order"),
      supabase.from("insights").select("*").eq("project_id", pid).order("sort_order"),
      supabase.from("runs").select("*").eq("project_id", pid).order("number", { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (!competitors || competitors.length === 0) return DEMO_OVERVIEW;

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
        : DEMO_OVERVIEW.run,
    };
  } catch {
    return DEMO_OVERVIEW;
  }
}

// Live feed mentions.
export async function getMentions(slug: string = DEMO_PROJECT_SLUG): Promise<MentionVM[]> {
  try {
    const supabase = await createClient();
    const pid = await projectId(slug);
    if (!pid) return DEMO_MENTIONS;

    const { data } = await supabase.from("mentions").select("*").eq("project_id", pid).order("sort_order");
    if (!data || data.length === 0) return DEMO_MENTIONS;

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
    return DEMO_MENTIONS;
  }
}

// Recent runs for the welcome portal.
export async function getRecentRuns(
  slug: string = DEMO_PROJECT_SLUG,
): Promise<{ number: number; mentions: number; cost: number; when: string }[]> {
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
    }));
  } catch {
    return DEMO_RUNS;
  }
}

// Per-section AI analysis (hero block). Seeded demo content until a real run
// generates it with Claude + Grok.
export async function getSectionAnalysis(section: string, slug: string = DEMO_PROJECT_SLUG): Promise<AnalysisVM | null> {
  const fallback = section === "overview" ? DEMO_ANALYSIS : null;
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
