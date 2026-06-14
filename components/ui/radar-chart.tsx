"use client";

import type { CSSProperties } from "react";

export type RadarSeries = { name: string; color: string; vals: number[] };

// Competitive radar / spider (SVG). Port of the design handoff's Charts.radar.
// Series are drawn back-to-front (series[0] paints last → on top).
export function RadarChart({
  axes,
  series,
  size = 330,
  r,
  className,
  style,
}: {
  axes: string[];
  series: RadarSeries[];
  size?: number;
  r?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const c = size / 2;
  const R = r ?? size * 0.34;
  const n = axes.length;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i: number, v: number): [number, number] => [c + Math.cos(ang(i)) * R * (v / 100), c + Math.sin(ang(i)) * R * (v / 100)];
  const ringPath = (g: number) => {
    let p = "";
    for (let i = 0; i < n; i++) {
      const [x, y] = pt(i, (100 * g) / 4);
      p += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1) + " ";
    }
    return p + "Z";
  };
  const order = series.map((_, i) => i).reverse();

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={className} style={{ width: size, height: size, maxWidth: "100%", overflow: "visible", ...style }} role="img" aria-label="radar">
      {[1, 2, 3, 4].map((g) => (
        <path key={g} d={ringPath(g)} fill="none" stroke="var(--border)" strokeWidth={1} />
      ))}
      {axes.map((ax, i) => {
        const [x, y] = pt(i, 100);
        const lx = c + Math.cos(ang(i)) * (R + 20);
        const ly = c + Math.sin(ang(i)) * (R + 16);
        const anchor = Math.abs(Math.cos(ang(i))) < 0.3 ? "middle" : Math.cos(ang(i)) > 0 ? "start" : "end";
        return (
          <g key={ax}>
            <line x1={c} y1={c} x2={x.toFixed(1)} y2={y.toFixed(1)} stroke="var(--border)" />
            <text x={lx.toFixed(1)} y={ly.toFixed(1)} textAnchor={anchor} dominantBaseline="middle" fontFamily="var(--font-mono)" fontSize={9.5} fill="var(--text-muted)">{ax}</text>
          </g>
        );
      })}
      {order.map((si) => {
        const sserie = series[si];
        let p = "";
        sserie.vals.forEach((v, i) => {
          const [x, y] = pt(i, v);
          p += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1) + " ";
        });
        return (
          <g key={sserie.name}>
            <path d={p + "Z"} fill={sserie.color} fillOpacity={0.13} stroke={sserie.color} strokeWidth={2} strokeLinejoin="round">
              <animate attributeName="fill-opacity" from="0" to="0.13" dur="0.6s" fill="freeze" />
            </path>
            {sserie.vals.map((v, i) => {
              const [x, y] = pt(i, v);
              return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={2.6} fill={sserie.color} />;
            })}
          </g>
        );
      })}
    </svg>
  );
}
