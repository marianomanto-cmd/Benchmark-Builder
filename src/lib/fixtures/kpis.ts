/**
 * Fixtures — KPIs del Overview (handoff §4.1).
 * Las funciones format viven en el componente KPI (cliente) — fixtures sólo
 * pasan un `formatKind` para evitar pasar funciones cross-boundary.
 */

export type FormatKind = "integer" | "compact" | "percent" | "currency";

export interface KPIFixture {
  label: string;
  numericValue: number;
  formatKind: FormatKind;
  delta: string;
  up: boolean;
  sparkData?: number[];
  bar?: number;
  tone?: "default" | "ink";
}

const spark = (seed: number) =>
  Array.from({ length: 12 }, (_, i) => 50 + Math.sin(i * 0.5 + seed) * 15 + i * 1.2);

export const OVERVIEW_KPIS: KPIFixture[] = [
  {
    label: "Menciones",
    numericValue: 9876,
    formatKind: "integer",
    delta: "+12,4 %",
    up: true,
    sparkData: spark(0.5),
  },
  {
    label: "Engagement",
    numericValue: 184213,
    formatKind: "compact",
    delta: "+8,1 %",
    up: true,
    sparkData: spark(1.2),
  },
  {
    label: "SOV cliente",
    numericValue: 22,
    formatKind: "percent",
    delta: "−3,2 pp",
    up: false,
    bar: 22,
    tone: "ink",
  },
  {
    label: "Inversión paga",
    numericValue: 1.84,
    formatKind: "currency",
    delta: "+0,4 %",
    up: true,
    sparkData: spark(2.4),
  },
];
