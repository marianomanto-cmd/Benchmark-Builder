/**
 * Fixtures — datos para <RankingBlock> (handoff §3.2).
 */

import type { PlatformKey, SentimentKind } from "@/components/domain";

export interface RankingItem {
  rank: number;
  title: string;
  subtitle?: string;
  metric: string;
  secondary?: string;
  platform?: PlatformKey;
  kind?: "photo" | "video" | "article" | "ad";
}

export interface RankingTableRow {
  name: string;
  isClient?: boolean;
  mentions: string;
  engagement: string;
  reach: string;
  sov: number;
  sentiment: SentimentKind;
  top: string;
}

export const TOP_ORGANIC: RankingItem[] = [
  { rank: 1, title: "LATAM Colombia", subtitle: "POV · primera vez", metric: "1,24M", secondary: "98k ♡ · 3,4k 💬", platform: "tiktok", kind: "video" },
  { rank: 2, title: "Avianca", subtitle: "Sunset Cartagena", metric: "412k", secondary: "52k ♡ · 1,1k 💬", platform: "instagram", kind: "photo" },
  { rank: 3, title: "Wingo", subtitle: "48h en Cartagena", metric: "42k", secondary: "2,1k ♡ · 312 📌", platform: "youtube", kind: "video" },
];

export const TOP_ADS: RankingItem[] = [
  { rank: 1, title: "Avianca · creativo 12d", metric: "1,4M", secondary: "USD 8–12k", platform: "meta_ads" },
  { rank: 2, title: "Avianca · video 14d", metric: "1,8M", secondary: "USD 12–18k", platform: "meta_ads" },
  { rank: 3, title: "LATAM · creativo 4d", metric: "620k", secondary: "USD 4–6k", platform: "meta_ads" },
  { rank: 4, title: "LATAM · video 8d", metric: "940k", secondary: "USD 6–9k", platform: "meta_ads" },
  { rank: 5, title: "Copa · static 9d", metric: "680k", secondary: "USD 5–8k", platform: "meta_ads" },
];

export const RANKING_TABLE: RankingTableRow[] = [
  { name: "Avianca", mentions: "998", engagement: "412k", reach: "1,8M", sov: 41.3, sentiment: "pos", top: "reel · sunset" },
  { name: "LATAM Colombia", mentions: "581", engagement: "264k", reach: "1,1M", sov: 24.0, sentiment: "mix", top: "POV TikTok" },
  { name: "Wingo", mentions: "312", engagement: "198k", reach: "680k", sov: 12.9, sentiment: "neu", top: "vlog 48h" },
  { name: "Arajet", mentions: "287", engagement: "142k", reach: "420k", sov: 11.9, sentiment: "neu", top: "tarifa promo" },
  { name: "Copa Airlines", isClient: true, mentions: "240", engagement: "188k", reach: "520k", sov: 9.9, sentiment: "pos", top: "sunset post" },
];
