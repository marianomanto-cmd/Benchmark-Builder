/**
 * Fixtures — plan de research propuesto por IA (handoff §4.5).
 */

import type { PlatformKey } from "@/components/domain";

export interface PlanSource {
  platform: PlatformKey;
  name: string;
  accounts: string[];
  volume: string;
  volumeCount: number;
  cost: number;
}

export const PLAN_SOURCES: PlanSource[] = [
  { platform: "instagram", name: "Instagram", accounts: ["avianca", "latamcol", "wingo.col", "arajetdom", "copaairlines"], volume: "~840 piezas", volumeCount: 840, cost: 0.42 },
  { platform: "tiktok", name: "TikTok", accounts: ["avianca", "latamcol", "wingo.col"], volume: "~412 piezas", volumeCount: 412, cost: 0.28 },
  { platform: "youtube", name: "YouTube", accounts: ["avianca", "latamcol", "wingo.col", "copaairlines"], volume: "~180 piezas", volumeCount: 180, cost: 0.18 },
  { platform: "x", name: "X / Grok", accounts: ["avianca", "latamcol", "arajetdom", "copaairlines"], volume: "~280 piezas", volumeCount: 280, cost: 0.14 },
  { platform: "reddit", name: "Reddit", accounts: ["r/Colombia", "r/ColombiaTravel", "r/Travel"], volume: "~120 hilos", volumeCount: 120, cost: 0.12 },
  { platform: "web", name: "Web · prensa", accounts: ["eltiempo.com", "elespectador.com", "semana.com", "+8"], volume: "~210 artículos", volumeCount: 210, cost: 0.42 },
  { platform: "meta_ads", name: "Meta Ad Library", accounts: ["avianca", "latamcol", "copaairlines"], volume: "~84 creativos", volumeCount: 84, cost: 0.28 },
];

export interface PlanParam {
  k: string;
  v: string;
  pos?: boolean;
}

export const PLAN_PARAMS: PlanParam[] = [
  { k: "Período", v: "60 días" },
  { k: "Idioma", v: "es · en" },
  { k: "Geo", v: "CO · PA · US" },
  { k: "Min. menciones", v: "≥ 3" },
  { k: "Filtro spam", v: "activado", pos: true },
  { k: "Análisis sentim.", v: "GPT-4o-mini" },
];
