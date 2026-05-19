/**
 * Fixtures — matriz comparativa competidor × métrica (handoff §4.3).
 */

import type { PlatformKey, SentimentKind } from "@/components/domain";

export interface CompareCol {
  id: string;
  name: string;
  brand: string;
  accent: string;
  isClient: boolean;
}

export type CellFmt = "mono" | "bar" | "plats" | "sent" | "text";

export interface CompareRow {
  label: string;
  fmt: CellFmt;
  vals: string[];
}

export const COMPARE_COLS: CompareCol[] = [
  { id: "avianca", name: "Avianca", brand: "A", accent: "var(--color-n-900)", isClient: false },
  { id: "latam", name: "LATAM", brand: "L", accent: "var(--color-n-700)", isClient: false },
  { id: "wingo", name: "Wingo", brand: "W", accent: "var(--color-n-500)", isClient: false },
  { id: "arajet", name: "Arajet", brand: "J", accent: "var(--color-n-400)", isClient: false },
  { id: "copa", name: "Copa", brand: "C", accent: "var(--color-sa-base)", isClient: true },
];

export const COMPARE_ROWS: CompareRow[] = [
  { label: "Menciones · 60d", fmt: "mono", vals: ["998", "581", "312", "287", "240"] },
  { label: "Engagement total", fmt: "mono", vals: ["412k", "264k", "198k", "142k", "188k"] },
  { label: "Reach estimado", fmt: "mono", vals: ["1,8M", "1,1M", "680k", "420k", "520k"] },
  { label: "Share of voice", fmt: "bar", vals: ["41,3%", "24,0%", "12,9%", "11,9%", "9,9%"] },
  { label: "Plataformas activas", fmt: "plats", vals: ["0", "1", "2", "3", "4"] },
  { label: "Sentimiento dominante", fmt: "sent", vals: ["pos", "mix", "neu", "neu", "pos"] },
  { label: "Inversión paga · est.", fmt: "mono", vals: ["USD 18–28k", "USD 10–14k", "—", "—", "USD 5–8k"] },
  { label: "Top contenido", fmt: "text", vals: ["Sunset reel", "POV TikTok", "Vlog 48h", "Tarifa promo", "Atardecer post"] },
  { label: "Frecuencia · post/sem", fmt: "mono", vals: ["12,4", "7,8", "4,2", "3,8", "3,1"] },
];

export const COMPARE_PLATS: PlatformKey[][] = [
  ["instagram", "tiktok", "youtube", "x", "meta_ads"],
  ["instagram", "facebook", "x", "meta_ads"],
  ["instagram", "tiktok", "facebook"],
  ["instagram", "x", "web"],
  ["instagram", "youtube", "x", "meta_ads"],
];

export const isSentiment = (v: string): v is SentimentKind =>
  v === "pos" || v === "neu" || v === "neg" || v === "mix";
