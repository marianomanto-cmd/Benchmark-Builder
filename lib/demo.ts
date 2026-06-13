import type { CompetitorVM, MentionVM, InsightVM, OverviewData } from "@/lib/view-models";
import { sparkFor } from "@/lib/view-models";

// Demo data for the Copa · Cartagena case. Used as a resilient fallback when
// Supabase isn't reachable/seeded, so the deployed site never breaks.

export const DEMO_COMPETITORS: CompetitorVM[] = [
  { name: "Avianca", handle: "avianca", brandLetter: "A", accent: "var(--series-1)", isClient: false, platforms: ["instagram", "tiktok", "youtube", "x", "meta_ads"], mentions: "998", sov: "41,3", sentiment: "pos", sparkData: sparkFor(0) },
  { name: "LATAM Colombia", handle: "latamcol", brandLetter: "L", accent: "var(--series-2)", isClient: false, platforms: ["instagram", "facebook", "x", "meta_ads"], mentions: "581", sov: "24,0", sentiment: "mix", sparkData: sparkFor(1) },
  { name: "Wingo", handle: "wingo.col", brandLetter: "W", accent: "var(--series-3)", isClient: false, platforms: ["instagram", "tiktok", "facebook"], mentions: "312", sov: "12,9", sentiment: "neu", sparkData: sparkFor(2) },
  { name: "Arajet", handle: "arajetdom", brandLetter: "J", accent: "var(--series-4)", isClient: false, platforms: ["instagram", "x", "web"], mentions: "287", sov: "11,9", sentiment: "neu", sparkData: sparkFor(3) },
  { name: "Copa Airlines", handle: "copaairlines", brandLetter: "C", accent: "var(--series-client)", isClient: true, platforms: ["instagram", "youtube", "x", "meta_ads"], mentions: "240", sov: "9,9", sentiment: "pos", sparkData: sparkFor(4) },
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
  { platform: "instagram", author: "Avianca", handle: "avianca", ts: "hace 4 h", brand: "Avianca", body: "Cartagena en frecuencia diaria desde Bogotá y Medellín. Conocé los nuevos horarios ☀️", thumbType: "photo", sentiment: "pos", isAd: false, metrics: [["♡", "12,4k"], ["💬", "284"], ["↗", "842"]] },
  { platform: "meta_ads", author: "Avianca", handle: "avianca · ad", ts: "activo · 12 d", brand: "Avianca", isAd: true, body: "Vuelos a Cartagena desde USD 89. Combiná con Medellín y Santa Marta. Reservá hasta el 30/05.", thumbType: "ad", sentiment: "pos", metrics: [["€", "USD 8–12k"], ["👁", "est. 1,4M"]] },
  { platform: "tiktok", author: "LATAM Colombia", handle: "latamcol", ts: "hace 9 h", brand: "LATAM", body: "POV: tu primera vez en Cartagena. Etiquetá a quien te llevarías 👇 #latamtok", thumbType: "video", sentiment: "pos", isAd: false, metrics: [["▷", "1,2M"], ["♡", "98k"], ["💬", "3,4k"]] },
  { platform: "youtube", author: "Wingo", handle: "wingo.col", ts: "hace 1 d", brand: "Wingo", body: "Vlog · Cartagena en 48h con vuelo Wingo · Costos reales · Tips de viaje 2026", thumbType: "video", sentiment: "neu", isAd: false, metrics: [["▷", "42k"], ["♡", "2,1k"]] },
  { platform: "instagram", author: "Copa Airlines", handle: "copaairlines", ts: "hace 18 h", brand: "Copa", body: "Atardecer en Cartagena, vista desde el equipo Copa ✈️ #copaairlines", thumbType: "photo", sentiment: "pos", isAd: false, metrics: [["♡", "8,2k"], ["💬", "142"]] },
  { platform: "web", author: "El Espectador", handle: "elespectador.com", ts: "03/05", brand: "—", body: "Avianca, LATAM y Wingo aumentan frecuencia a Cartagena para temporada 2026.", thumbType: "article", sentiment: "neu", isAd: false, metrics: [["📄", "prensa"], ["👁", "24k"]] },
  { platform: "x", author: "Arajet", handle: "arajetdom", ts: "hace 6 h", brand: "Arajet", body: "Promo a Cartagena desde RD$ 3.999 ida. Tarifa final con impuestos publicada.", sentiment: "neu", isAd: false, metrics: [["♡", "312"], ["🔁", "48"], ["💬", "22"]] },
  { platform: "reddit", author: "r/ColombiaTravel", handle: "u/sanmt", ts: "hace 2 d", brand: "—", body: "¿Vale la pena Wingo Bogotá–Cartagena? Compré ida + vuelta y hubo cambio de horario 2 veces…", sentiment: "neg", isAd: false, metrics: [["↑", "142"], ["💬", "38"]] },
  { platform: "meta_ads", author: "LATAM", handle: "latamcol · ad", ts: "activo · 4 d", brand: "LATAM", isAd: true, body: "Cartagena con escala en Bogotá. Equipaje incluido. Reservá con LATAM Pass.", thumbType: "ad", sentiment: "neu", metrics: [["€", "USD 4–6k"], ["👁", "est. 620k"]] },
  { platform: "instagram", author: "Wingo", handle: "wingo.col", ts: "hace 7 h", brand: "Wingo", body: "Tarifas a Cartagena que sí caben en tu bolsillo 💜", thumbType: "photo", sentiment: "pos", isAd: false, metrics: [["♡", "3,4k"], ["💬", "96"]] },
  { platform: "facebook", author: "Avianca", handle: "avianca", ts: "hace 1 d", brand: "Avianca", body: "Sumamos un vuelo más por día a Cartagena en temporada alta.", thumbType: "article", sentiment: "pos", isAd: false, metrics: [["♡", "1,9k"], ["💬", "210"]] },
  { platform: "tiktok", author: "Wingo", handle: "wingo.col", ts: "hace 14 h", brand: "Wingo", body: "Cartagena en modo low cost: 3 tips para volar barato ✈️", thumbType: "video", sentiment: "pos", isAd: false, metrics: [["▷", "210k"], ["♡", "18k"]] },
  { platform: "youtube", author: "Avianca", handle: "avianca", ts: "hace 3 d", brand: "Avianca", body: "Detrás de escena: cómo preparamos un vuelo a Cartagena", thumbType: "video", sentiment: "neu", isAd: false, metrics: [["▷", "88k"], ["♡", "4,2k"]] },
  { platform: "x", author: "LATAM Colombia", handle: "latamcol", ts: "hace 11 h", brand: "LATAM", body: "Hoy volamos lleno a Cartagena. Gracias por elegirnos ❤️", sentiment: "pos", isAd: false, metrics: [["♡", "1,1k"], ["🔁", "132"]] },
  { platform: "reddit", author: "r/Colombia", handle: "u/viajero_co", ts: "hace 4 d", brand: "—", body: "Comparativa de precios Bogotá–Cartagena: Avianca vs LATAM vs Wingo", sentiment: "neu", isAd: false, metrics: [["↑", "318"], ["💬", "124"]] },
  { platform: "bluesky", author: "Caro Méndez", handle: "caromendez.bsky.social", ts: "hace 5 h", brand: "—", body: "Servicio impecable de Copa a Cartagena, recomendadísimo 👌", sentiment: "pos", isAd: false, metrics: [["♡", "84"], ["🔁", "12"]] },
  { platform: "instagram", author: "Arajet", handle: "arajetdom", ts: "hace 1 d", brand: "Arajet", body: "Nueva ruta a Cartagena: conocé las fechas de lanzamiento.", thumbType: "photo", sentiment: "pos", isAd: false, metrics: [["♡", "2,2k"], ["💬", "73"]] },
  { platform: "web", author: "Semana", handle: "semana.com", ts: "01/05", brand: "—", body: "Guerra de tarifas a Cartagena: el verano más competitivo en años.", thumbType: "article", sentiment: "mix", isAd: false, metrics: [["📄", "prensa"], ["👁", "41k"]] },
];

export const DEMO_PROJECT_SLUG = "cartagena-q2-2026";
