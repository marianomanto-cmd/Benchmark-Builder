// Deterministic fixtures for mock-mode runs. Derived from the canned demo set
// so a full run can be validated end-to-end with zero real API cost. Pure &
// portable (no server-only) — used only by the runner.
import { DEMO_MENTIONS, DEMO_INSIGHTS } from "@/lib/demo";
import type { RawMention } from "@/lib/sources/types";
import type { PlatformKey, SentimentKind, InsightKind } from "@/lib/platforms";

const SENTIMENT_SCORE: Record<SentimentKind, number> = { pos: 0.82, neu: 0.5, neg: 0.18, mix: 0.5 };

// Canned RawMentions for a platform, normalized from the demo set.
export function demoRawMentions(platform: PlatformKey): RawMention[] {
  return DEMO_MENTIONS.filter((m) => m.platform === platform).map((m, i) => ({
    platform,
    externalId: `demo-${platform}-${i}`,
    author: m.author,
    handle: m.handle.replace(/\s·\sad$/, "").replace(/^@/, ""),
    text: m.body,
    isAd: m.isAd ?? false,
    thumbType: m.thumbType,
    engagement: {},
  }));
}

// Deterministic sentiment scores aligned to the demo mention bodies (order-free).
const BODY_SENTIMENT = new Map(DEMO_MENTIONS.map((m) => [m.body, m.sentiment]));
export function demoScores(texts: string[]): number[] {
  return texts.map((t) => SENTIMENT_SCORE[BODY_SENTIMENT.get(t) ?? "neu"]);
}

// Canned paid-ad mentions per platform (mock mode for the paid pipeline).
const AD_BRANDS = ["Avianca", "LATAM", "Copa Airlines", "Wingo"];
export function demoAdMentions(platform: PlatformKey): RawMention[] {
  return AD_BRANDS.slice(0, 3).map((brand, i) => ({
    platform,
    externalId: `demo-ad-${platform}-${i}`,
    author: brand,
    handle: brand.toLowerCase().replace(/\s+/g, ""),
    text: `Vuelos a Cartagena desde USD ${79 + i * 10}. Reservá hoy. (${platform})`,
    isAd: true,
    thumbType: "ad" as const,
    ad: {
      cta: "Reservar",
      landingUrl: "https://example.com/cartagena",
      startedAt: new Date(Date.now() - (i + 2) * 86400_000).toISOString(),
      activeStatus: "active",
      adType: platform === "google_ads" ? "search" : "image",
      spendRange: platform === "meta_ads" ? `USD ${4 + i}k–${8 + i}k` : undefined,
      impressions: platform === "meta_ads" ? `${600 + i * 200}k` : undefined,
    },
    engagement: {},
  }));
}

// Canned insight drafts (matches the shape generateInsights returns).
export function demoInsightDrafts(): { kind: InsightKind; title: string; body: string; sources: number; confidence: number }[] {
  return DEMO_INSIGHTS.map((d) => ({
    kind: d.kind,
    title: d.title,
    body: "Insight de demostración generado en modo mock.",
    sources: d.sources,
    confidence: Number(d.confidence.replace(",", ".")) || 0.8,
  }));
}
