import type { CompetitorVM, MentionVM, InsightVM, OverviewData } from "@/lib/view-models";
import { sparkFor } from "@/lib/view-models";

// Demo data for the Copa · Cartagena case. Used as a resilient fallback when
// Supabase isn't reachable/seeded, so the deployed site never breaks.

export const DEMO_COMPETITORS: CompetitorVM[] = [
  { name: "Avianca", handle: "avianca", brandLetter: "A", accent: "var(--n900)", isClient: false, platforms: ["instagram", "tiktok", "youtube", "x", "meta_ads"], mentions: "998", sov: "41,3", sentiment: "pos", sparkData: sparkFor(0) },
  { name: "LATAM Colombia", handle: "latamcol", brandLetter: "L", accent: "var(--n700)", isClient: false, platforms: ["instagram", "facebook", "x", "meta_ads"], mentions: "581", sov: "24,0", sentiment: "mix", sparkData: sparkFor(1) },
  { name: "Wingo", handle: "wingo.col", brandLetter: "W", accent: "var(--n500)", isClient: false, platforms: ["instagram", "tiktok", "facebook"], mentions: "312", sov: "12,9", sentiment: "neu", sparkData: sparkFor(2) },
  { name: "Arajet", handle: "arajetdom", brandLetter: "J", accent: "var(--n400)", isClient: false, platforms: ["instagram", "x", "web"], mentions: "287", sov: "11,9", sentiment: "neu", sparkData: sparkFor(3) },
  { name: "Copa Airlines", handle: "copaairlines", brandLetter: "C", accent: "var(--sa-base)", isClient: true, platforms: ["instagram", "youtube", "x", "meta_ads"], mentions: "240", sov: "9,9", sentiment: "pos", sparkData: sparkFor(4) },
];

export const DEMO_INSIGHTS: InsightVM[] = [
  { kind: "opp", title: "LATAM no usa TikTok orgánico", sources: 38, confidence: "0,87" },
  { kind: "thr", title: "Avianca duplicó spend en Meta", sources: 14, confidence: "0,79" },
  { kind: "pat", title: "Picos jueves 11h", sources: 62, confidence: "0,92" },
];

export const DEMO_OVERVIEW: OverviewData = {
  competitors: DEMO_COMPETITORS,
  insights: DEMO_INSIGHTS,
  run: { number: 42, used: 42.18, soft: 50, hard: 75 },
};

export const DEMO_MENTIONS: MentionVM[] = [
  { platform: "instagram", author: "Avianca", handle: "avianca", ts: "hace 4 h", brand: "Avianca", body: "Cartagena en frecuencia diaria desde Bogotá y Medellín. Conocé los nuevos horarios de mañana ☀️", thumbType: "photo", sentiment: "pos", isAd: false, metrics: [["♡", "12,4k"], ["💬", "284"], ["↗", "842"]] },
  { platform: "meta_ads", author: "Avianca", handle: "avianca · ad", ts: "activo · 12 d", brand: "Avianca", isAd: true, body: "Vuelos a Cartagena desde USD 89. Combiná con Medellín y Santa Marta. Reservá hasta el 30/05.", thumbType: "ad", sentiment: "pos", metrics: [["€", "USD 8–12k"], ["👁", "est. 1,4M"]] },
  { platform: "tiktok", author: "LATAM Colombia", handle: "latamcol", ts: "hace 9 h", brand: "LATAM", body: "POV: tu primera vez en Cartagena. Etiquetá a quien te llevarías 👇 #latamtok", thumbType: "video", sentiment: "pos", isAd: false, metrics: [["▷", "1,2M"], ["♡", "98k"], ["💬", "3,4k"]] },
  { platform: "youtube", author: "Wingo", handle: "wingo.col", ts: "hace 1 d", brand: "Wingo", body: "Vlog · Cartagena en 48h con vuelo Wingo · Costos reales · Tips de viaje 2026", thumbType: "video", sentiment: "neu", isAd: false, metrics: [["▷", "42k"], ["♡", "2,1k"]] },
  { platform: "instagram", author: "Copa Airlines", handle: "copaairlines", ts: "hace 18 h", brand: "Copa", body: "Atardecer en Cartagena, vista desde el equipo Copa ✈️ #copaairlines", thumbType: "photo", sentiment: "pos", isAd: false, metrics: [["♡", "8,2k"], ["💬", "142"]] },
  { platform: "web", author: "El Espectador", handle: "elespectador.com", ts: "03/05", brand: "—", body: "Avianca, LATAM y Wingo aumentan frecuencia a Cartagena para temporada 2026.", thumbType: "article", sentiment: "neu", isAd: false, metrics: [["📄", "prensa"], ["👁", "24k"]] },
];

export const DEMO_PROJECT_SLUG = "cartagena-q2-2026";
