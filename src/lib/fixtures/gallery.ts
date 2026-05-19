/**
 * Fixtures — galería orgánico vs pago (handoff §4.4).
 */

import type { PlatformKey } from "@/components/domain";

export interface GalleryItem {
  id: string;
  kind: "photo" | "video" | "article" | "ad";
  platform: PlatformKey;
  label: string;
  metrics: string[];
  isAd?: boolean;
}

export interface GalleryGroup {
  name: string;
  count: number;
  items: GalleryItem[];
}

export const ORGANIC_GROUPS: GalleryGroup[] = [
  {
    name: "Avianca",
    count: 84,
    items: [
      { id: "o-av-1", kind: "photo", platform: "instagram", label: "sunset reel", metrics: ["12,4k ♡", "4 h"] },
      { id: "o-av-2", kind: "photo", platform: "instagram", label: "crew", metrics: ["8,2k ♡", "12 h"] },
      { id: "o-av-3", kind: "video", platform: "tiktok", label: "recorrido", metrics: ["480k ▷", "1 d"] },
    ],
  },
  {
    name: "LATAM",
    count: 56,
    items: [
      { id: "o-la-1", kind: "video", platform: "tiktok", label: "POV viaje", metrics: ["1,2M ▷", "9 h"] },
      { id: "o-la-2", kind: "photo", platform: "instagram", label: "mapa", metrics: ["3,2k ♡", "2 d"] },
      { id: "o-la-3", kind: "article", platform: "facebook", label: "noticia", metrics: ["820 ↗", "3 d"] },
    ],
  },
  {
    name: "Wingo",
    count: 42,
    items: [
      { id: "o-wi-1", kind: "video", platform: "youtube", label: "vlog 48h", metrics: ["42k ▷", "1 d"] },
      { id: "o-wi-2", kind: "photo", platform: "instagram", label: "tarifa", metrics: ["1,4k ♡", "2 d"] },
      { id: "o-wi-3", kind: "video", platform: "tiktok", label: "duet", metrics: ["98k ▷", "3 d"] },
    ],
  },
];

export const AD_GROUPS: GalleryGroup[] = [
  {
    name: "Avianca",
    count: 38,
    items: [
      { id: "a-av-1", kind: "ad", platform: "meta_ads", label: "creativo · 12d", metrics: ["USD 8–12k", "1,4M 👁"], isAd: true },
      { id: "a-av-2", kind: "ad", platform: "meta_ads", label: "video · 14d", metrics: ["USD 12–18k", "1,8M 👁"], isAd: true },
      { id: "a-av-3", kind: "ad", platform: "meta_ads", label: "carousel · 6d", metrics: ["USD 3–5k", "410k 👁"], isAd: true },
    ],
  },
  {
    name: "LATAM",
    count: 24,
    items: [
      { id: "a-la-1", kind: "ad", platform: "meta_ads", label: "creativo · 4d", metrics: ["USD 4–6k", "620k 👁"], isAd: true },
      { id: "a-la-2", kind: "ad", platform: "meta_ads", label: "video · 8d", metrics: ["USD 6–9k", "940k 👁"], isAd: true },
      { id: "a-la-3", kind: "ad", platform: "meta_ads", label: "static · 2d", metrics: ["USD 1–2k", "180k 👁"], isAd: true },
    ],
  },
  {
    name: "Copa",
    count: 14,
    items: [
      { id: "a-co-1", kind: "ad", platform: "meta_ads", label: "static · 9d", metrics: ["USD 5–8k", "680k 👁"], isAd: true },
      { id: "a-co-2", kind: "ad", platform: "meta_ads", label: "creativo · 3d", metrics: ["USD 2–4k", "280k 👁"], isAd: true },
      { id: "a-co-3", kind: "ad", platform: "meta_ads", label: "video · 5d", metrics: ["USD 3–5k", "340k 👁"], isAd: true },
    ],
  },
];
