/**
 * <BBBarChart> — handoff §3.1.
 * Stacked bars 12 meses · 5 series · paleta monocromática `n-900 → n-300`
 * + cliente (Copa) en sangría siempre arriba del stack.
 * Gridlines 1px dashed n-200 · etiquetas mes en mono 10px n-500.
 * Animaciones: barras crecen desde abajo, stagger 50ms, 600ms ease-out.
 */

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { VOLUME_DATA, CHART_COLORS, type ChartDatum } from "@/lib/fixtures/chart";

const stack = "v";

interface BBBarChartProps {
  data?: ChartDatum[];
  height?: number;
}

interface TooltipPayload {
  dataKey: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

const NAMES: Record<string, string> = {
  avianca: "Avianca",
  latam: "LATAM",
  wingo: "Wingo",
  arajet: "Arajet",
  copa: "Copa",
};

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;
  // Reorder: Copa always last (top of stack visually = first in tooltip)
  const ordered = [...payload].reverse();
  return (
    <div className="bg-white border border-n-200 rounded-md shadow-3 p-2.5 min-w-[140px]">
      <div className="t-mono text-[10px] text-n-500 uppercase tracking-[0.1em] mb-1.5">
        Mes {label}
      </div>
      <div className="flex flex-col gap-1">
        {ordered.map((p) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-3 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm" style={{ background: p.color }} />
              <span className="text-n-700">{NAMES[p.dataKey] ?? p.dataKey}</span>
            </span>
            <span className="font-mono tabular-nums text-n-900">
              {p.value.toLocaleString("es-AR")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function BBBarChart({ data = VOLUME_DATA, height = 240 }: BBBarChartProps) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid
            stroke="var(--color-n-200)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{
              fill: "var(--color-n-500)",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
            }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-n-200)" }}
          />
          <YAxis
            tick={{
              fill: "var(--color-n-500)",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
            }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "var(--color-n-100)", opacity: 0.5 }}
          />
          <Bar dataKey="avianca" stackId={stack} fill={CHART_COLORS.avianca} radius={0} />
          <Bar dataKey="latam" stackId={stack} fill={CHART_COLORS.latam} radius={0} />
          <Bar dataKey="wingo" stackId={stack} fill={CHART_COLORS.wingo} radius={0} />
          <Bar dataKey="arajet" stackId={stack} fill={CHART_COLORS.arajet} radius={0} />
          {/* Cliente arriba del stack siempre */}
          <Bar
            dataKey="copa"
            stackId={stack}
            fill={CHART_COLORS.copa}
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 px-2">
        {Object.entries(CHART_COLORS).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm" style={{ background: color }} />
            <span className="text-[11px] text-n-700">{NAMES[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
