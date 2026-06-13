// Pre-run cost estimate. Pure & portable: feed it a plan (what the wizard
// configured) and it returns a breakdown by provider plus a low/high band.
// The same plan shape is what the runner will execute, so the estimate and the
// actual ledger stay comparable (test:run-mock asserts totals ≈ estimate).

import {
  apifyCostUSD,
  imageAnalysisCostUSD,
  synthesisCostUSD,
  transcriptionCostUSD,
  grokSearchCostUSD,
  cents,
  getRates,
  type Rates,
} from "./rates";

// Provider that backs a given source — determines which line the cost lands on
// and which kill-switch flag / key gates it.
export type SourceProvider = "apify" | "grok" | "reddit" | "mastodon" | "bluesky" | "meta_ads" | "free";

export type RunPlan = {
  sources: { platform: string; items: number; provider: SourceProvider }[];
  // Media to analyze with Claude vision.
  images: number;
  videos: number;
  framesPerVideo: number;
  // Transcription.
  avgVideoMinutes: number;
  transcribeVideos: boolean;
  useWhisper: boolean; // false → free YouTube captions
  // Per-section AI synthesis (overview, comparativa, live-feed, galeria, …).
  synthesisSections: number;
};

export type CostBreakdown = {
  apify: number;
  grok: number;
  claude_vision: number;
  transcription: number;
  claude_synthesis: number;
};

export type RunCostEstimate = {
  breakdown: CostBreakdown;
  total: number;
  total_low: number;
  total_high: number;
};

// Uncertainty band applied to the point estimate (scraped volume is the main
// source of variance). Overridable so we can tighten it as we learn.
function band(name: string, fallback: number): number {
  const v = process.env[name];
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function estimateRunCost(plan: RunPlan, r: Rates = getRates()): RunCostEstimate {
  const breakdown: CostBreakdown = {
    apify: 0,
    grok: 0,
    claude_vision: 0,
    transcription: 0,
    claude_synthesis: 0,
  };

  for (const s of plan.sources) {
    if (s.provider === "apify") breakdown.apify += apifyCostUSD(s.items, r);
    else if (s.provider === "grok") breakdown.grok += grokSearchCostUSD(Math.max(1, Math.ceil(s.items / 25)), r);
    // reddit / mastodon / bluesky / meta_ads → free APIs, no line cost.
  }

  const visionCalls = plan.images + plan.videos * plan.framesPerVideo;
  breakdown.claude_vision = visionCalls * imageAnalysisCostUSD(r);

  if (plan.transcribeVideos && plan.videos > 0) {
    breakdown.transcription = plan.videos * transcriptionCostUSD(plan.avgVideoMinutes, plan.useWhisper, r);
  }

  breakdown.claude_synthesis = plan.synthesisSections * synthesisCostUSD(r);

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const low = band("EST_BAND_LOW", 0.85);
  const high = band("EST_BAND_HIGH", 1.3);

  for (const k of Object.keys(breakdown) as (keyof CostBreakdown)[]) breakdown[k] = cents(breakdown[k]);

  return {
    breakdown,
    total: cents(total),
    total_low: cents(total * low),
    total_high: cents(total * high),
  };
}
