/**
 * Fixtures — BBBarChart (12 meses · 5 series).
 * Serie del cliente (Copa) siempre arriba del stack y en sangría.
 */

const MONTHS = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export interface ChartDatum {
  month: string;
  avianca: number;
  latam: number;
  wingo: number;
  arajet: number;
  copa: number;
}

export const VOLUME_DATA: ChartDatum[] = MONTHS.map((m, i) => ({
  month: m,
  avianca: 240 + Math.round(Math.sin(i * 0.6) * 60 + i * 8),
  latam: 200 + Math.round(Math.sin(i * 0.5 + 1) * 50 + i * 6),
  wingo: 110 + Math.round(Math.sin(i * 0.7 + 2) * 35),
  arajet: 70 + Math.round(Math.sin(i * 0.4 + 3) * 25),
  copa: 180 + Math.round(Math.sin(i * 0.55 + 4) * 45 + i * 7),
}));

export const CHART_COLORS = {
  avianca: "var(--color-n-900)",
  latam: "var(--color-n-700)",
  wingo: "var(--color-n-500)",
  arajet: "var(--color-n-300)",
  copa: "var(--color-sa-base)",
} as const;
