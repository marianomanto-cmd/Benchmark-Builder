/**
 * Fixtures — competidores del caso demo (handoff intro): Copa Airlines vs
 * Avianca / LATAM / Wingo / Arajet · ruta Cartagena.
 * Sparkline = 14 puntos sintéticos basados en sin/cos para tener "movimiento".
 */

import type { PlatformKey } from "@/components/domain";
import type { SentimentKind } from "@/components/domain";

export interface CompetitorFixture {
  id: string;
  name: string;
  handle: string;
  brand: string;
  isClient: boolean;
  accent: string;
  platforms: PlatformKey[];
  mentions: number;
  mentionsLabel: string;
  sov: number;
  sovLabel: string;
  sent: SentimentKind;
  sparkData: number[];
}

const spark = (seed: number) =>
  Array.from({ length: 14 }, (_, i) => 50 + Math.sin(i * 0.6 + seed) * 18 + Math.cos(i * 0.3 + seed * 2) * 10);

export const COMPETITORS: CompetitorFixture[] = [
  {
    id: "avianca",
    name: "Avianca",
    handle: "@avianca",
    brand: "A",
    isClient: false,
    accent: "var(--color-n-900)",
    platforms: ["instagram", "tiktok", "x", "facebook", "youtube"],
    mentions: 3128,
    mentionsLabel: "3.128",
    sov: 0.298,
    sovLabel: "29,8 %",
    sent: "pos",
    sparkData: spark(0.4),
  },
  {
    id: "latam",
    name: "LATAM",
    handle: "@latam",
    brand: "L",
    isClient: false,
    accent: "var(--color-n-700)",
    platforms: ["instagram", "x", "facebook", "youtube"],
    mentions: 2418,
    mentionsLabel: "2.418",
    sov: 0.241,
    sovLabel: "24,1 %",
    sent: "neu",
    sparkData: spark(1.1),
  },
  {
    id: "wingo",
    name: "Wingo",
    handle: "@wingoair",
    brand: "W",
    isClient: false,
    accent: "var(--color-n-500)",
    platforms: ["instagram", "tiktok", "facebook"],
    mentions: 1284,
    mentionsLabel: "1.284",
    sov: 0.144,
    sovLabel: "14,4 %",
    sent: "mix",
    sparkData: spark(2.3),
  },
  {
    id: "arajet",
    name: "Arajet",
    handle: "@arajet",
    brand: "R",
    isClient: false,
    accent: "var(--color-n-300)",
    platforms: ["instagram", "tiktok", "facebook"],
    mentions: 942,
    mentionsLabel: "942",
    sov: 0.097,
    sovLabel: "9,7 %",
    sent: "neu",
    sparkData: spark(3.0),
  },
  {
    id: "copa",
    name: "Copa Airlines",
    handle: "@copaairlines",
    brand: "C",
    isClient: true,
    accent: "var(--color-sa-base)",
    platforms: ["instagram", "tiktok", "x", "facebook", "youtube"],
    mentions: 2104,
    mentionsLabel: "2.104",
    sov: 0.220,
    sovLabel: "22,0 %",
    sent: "pos",
    sparkData: spark(4.2),
  },
];

export const getClient = () => COMPETITORS.find((c) => c.isClient)!;
