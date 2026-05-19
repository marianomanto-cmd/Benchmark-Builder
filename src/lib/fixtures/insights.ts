/**
 * Fixtures — insights y alertas del Overview.
 */

import type { InsightKind, Severity } from "@/components/domain";

export interface InsightFixture {
  kind: InsightKind;
  title: string;
  body: string;
  sources: number;
  confidence: string;
}

export const OVERVIEW_INSIGHTS: InsightFixture[] = [
  {
    kind: "opp",
    title: "Wingo perdió 18 % de engagement en su última campaña visual",
    body: "Los comentarios negativos crecieron en TikTok tras la propuesta de equipaje cobrado. Window de 3 días para responder con narrativa de transparencia.",
    sources: 142,
    confidence: "0,87",
  },
  {
    kind: "thr",
    title: "Avianca posicionando 'directo' en Cartagena con 4× más impresiones",
    body: "Cuatro ads activos en Meta Ad Library destacando vuelo directo CTG. Conversación orgánica acompaña.",
    sources: 218,
    confidence: "0,91",
  },
  {
    kind: "pat",
    title: "Picos de menciones los jueves entre 19–22hs",
    body: "Repetición observada en las últimas 6 semanas. Coincide con calendarios de promo de LATAM y Avianca.",
    sources: 84,
    confidence: "0,78",
  },
];

export interface AlertFixture {
  severity: Severity;
  title: string;
  body: string;
  when: string;
  evidence?: string;
}

export const OVERVIEW_ALERTS: AlertFixture[] = [
  {
    severity: "high",
    title: "Spike de menciones negativas · Copa",
    body: "Crecimiento del 240 % en menciones negativas en las últimas 6h. Tema principal: demora vuelo CM-321.",
    when: "hace 14 min",
    evidence: "twitter.com/.../status/178…",
  },
];
