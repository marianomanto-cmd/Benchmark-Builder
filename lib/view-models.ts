import type { PlatformKey, SentimentKind, ThumbKind, InsightKind } from "@/lib/platforms";

// View-models: the exact shapes the screens consume. Keeps screens dumb
// (props-driven) and decoupled from the DB row shapes.

export type CompetitorVM = {
  name: string;
  handle: string;
  brandLetter: string;
  accent: string;
  isClient: boolean;
  platforms: PlatformKey[];
  mentions: string;
  sov: string;
  sentiment: SentimentKind;
  sparkData: number[];
};

export type MentionVM = {
  platform: PlatformKey;
  author: string;
  handle: string;
  ts: string;
  brand: string;
  body: string;
  metrics: [string, string][];
  sentiment: SentimentKind;
  isAd: boolean;
  thumbType?: ThumbKind;
  media?: string;
  video?: string;
};

export type InsightVM = {
  kind: InsightKind;
  title: string;
  sources: number;
  confidence: string;
};

export type RunVM = { number: number; used: number; soft: number; hard: number };

export type AnalysisVM = { headline: string; body: string; takeaways: string[]; recommendations: string[] };

export type OverviewData = {
  competitors: CompetitorVM[];
  insights: InsightVM[];
  run: RunVM;
};

// Deterministic sparkline so DB competitors render a stable trend line.
export function sparkFor(i: number): number[] {
  return Array.from({ length: 14 }, (_, j) => Math.sin(j * 0.7 + i) * 8 + 12 + j * 1.2);
}

// es-AR confidence label: 0.87 -> "0,87"
export function confLabel(n: number): string {
  return n.toFixed(2).replace(".", ",");
}
