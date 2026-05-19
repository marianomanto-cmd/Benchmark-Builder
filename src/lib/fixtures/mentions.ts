/**
 * Fixtures — menciones del feed (caso Cartagena Q3). Datos sintéticos Fase 1.
 * Cada mención lleva las dimensiones de filtrado (competitor / platform /
 * sentiment / type) más engagement/recency para el sort.
 */

import type { PlatformKey, SentimentKind } from "@/components/domain";

export type MentionType = "organic" | "ad";
export type CompetitorId = "avianca" | "latam" | "wingo" | "arajet" | "copa";

export interface MentionFixture {
  id: string;
  platform: PlatformKey;
  competitor: CompetitorId;
  author: string;
  handle: string;
  ts: string;
  brand: string;
  body: string;
  thumbType?: "photo" | "video" | "article" | "ad";
  isAd?: boolean;
  sentiment: SentimentKind;
  type: MentionType;
  engagement: number;
  recency: number;
  metrics: [string, string][];
}

export const MENTIONS: MentionFixture[] = [
  {
    id: "m1",
    platform: "instagram",
    competitor: "avianca",
    author: "Avianca",
    handle: "avianca",
    ts: "hace 4 h",
    brand: "Avianca",
    body: "Cartagena en frecuencia diaria desde Bogotá y Medellín. Conocé los nuevos horarios de mañana ☀️",
    thumbType: "photo",
    sentiment: "pos",
    type: "organic",
    engagement: 13526,
    recency: 96,
    metrics: [["♡", "12,4k"], ["💬", "284"], ["↗", "842"]],
  },
  {
    id: "m2",
    platform: "meta_ads",
    competitor: "avianca",
    author: "Avianca",
    handle: "avianca · ad",
    ts: "activo · 12 d",
    brand: "Avianca",
    body: "Vuelos a Cartagena desde USD 89. Combiná con Medellín y Santa Marta. Reservá hasta el 30/05.",
    thumbType: "ad",
    isAd: true,
    sentiment: "pos",
    type: "ad",
    engagement: 9000,
    recency: 80,
    metrics: [["€", "USD 8–12k"], ["👁", "est. 1,4M"]],
  },
  {
    id: "m3",
    platform: "tiktok",
    competitor: "latam",
    author: "LATAM Colombia",
    handle: "latamcol",
    ts: "hace 9 h",
    brand: "LATAM",
    body: "POV: tu primera vez en Cartagena. Etiquetá a quien te llevarías 👇 #latamtok",
    thumbType: "video",
    sentiment: "pos",
    type: "organic",
    engagement: 1303400,
    recency: 91,
    metrics: [["▷", "1,2M"], ["♡", "98k"], ["💬", "3,4k"]],
  },
  {
    id: "m4",
    platform: "youtube",
    competitor: "wingo",
    author: "Wingo",
    handle: "wingo.col",
    ts: "hace 1 d",
    brand: "Wingo",
    body: "Vlog · Cartagena en 48h con vuelo Wingo · Costos reales · Tips de viaje 2026",
    thumbType: "video",
    sentiment: "neu",
    type: "organic",
    engagement: 44100,
    recency: 60,
    metrics: [["▷", "42k"], ["♡", "2,1k"]],
  },
  {
    id: "m5",
    platform: "instagram",
    competitor: "copa",
    author: "Copa Airlines",
    handle: "copaairlines",
    ts: "hace 18 h",
    brand: "Copa",
    body: "Atardecer en Cartagena, vista desde el equipo Copa ✈️ #copaairlines",
    thumbType: "photo",
    sentiment: "pos",
    type: "organic",
    engagement: 8342,
    recency: 70,
    metrics: [["♡", "8,2k"], ["💬", "142"]],
  },
  {
    id: "m6",
    platform: "web",
    competitor: "avianca",
    author: "El Espectador",
    handle: "elespectador.com",
    ts: "03/05",
    brand: "—",
    body: "Avianca, LATAM y Wingo aumentan frecuencia a Cartagena para temporada 2026.",
    thumbType: "article",
    sentiment: "neu",
    type: "organic",
    engagement: 24000,
    recency: 40,
    metrics: [["📄", "prensa"], ["👁", "24k"]],
  },
  {
    id: "m7",
    platform: "instagram",
    competitor: "arajet",
    author: "Arajet",
    handle: "arajet",
    ts: "hace 2 d",
    brand: "Arajet",
    body: "Tarifas a Cartagena desde el Caribe. Volá inteligente, pagá menos. #Arajet",
    thumbType: "photo",
    sentiment: "neu",
    type: "organic",
    engagement: 3120,
    recency: 48,
    metrics: [["♡", "2,8k"], ["💬", "61"]],
  },
  {
    id: "m8",
    platform: "x",
    competitor: "latam",
    author: "Pasajero molesto",
    handle: "viajero_bog",
    ts: "hace 6 h",
    brand: "LATAM",
    body: "3 horas de demora en el vuelo a Cartagena y sin información. @latam esto es inaceptable.",
    sentiment: "neg",
    type: "organic",
    engagement: 1840,
    recency: 94,
    metrics: [["♡", "412"], ["↻", "188"], ["💬", "97"]],
  },
  {
    id: "m9",
    platform: "meta_ads",
    competitor: "copa",
    author: "Copa Airlines",
    handle: "copaairlines · ad",
    ts: "activo · 6 d",
    brand: "Copa",
    body: "Conectá con Cartagena vía Hub de las Américas. Equipaje incluido y ConnectMiles.",
    thumbType: "ad",
    isAd: true,
    sentiment: "pos",
    type: "ad",
    engagement: 6500,
    recency: 88,
    metrics: [["€", "USD 5–9k"], ["👁", "est. 920k"]],
  },
  {
    id: "m10",
    platform: "tiktok",
    competitor: "wingo",
    author: "Wingo",
    handle: "wingo.col",
    ts: "hace 14 h",
    brand: "Wingo",
    body: "Cartagena low cost ✈️ ¿vale la pena? Te contamos lo bueno y lo malo. #wingo",
    thumbType: "video",
    sentiment: "mix",
    type: "organic",
    engagement: 88200,
    recency: 86,
    metrics: [["▷", "84k"], ["♡", "4,2k"], ["💬", "612"]],
  },
];
