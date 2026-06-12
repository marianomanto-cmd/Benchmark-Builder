"use client";

// ============================================================
// BBBarChart — 12 months · 5 stacked series.
// Client series (Copa) always sits on top, in sangría. HANDOFF §3.1.
// In a later pass this can move to Recharts; the static SVG keeps the
// visual contract 1:1 with the mock for now.
// ============================================================
export function BBBarChart() {
  const months = ["M", "A", "M", "J", "J", "A", "S", "O", "N", "D", "E", "F"];
  const data = months.map((_, i) => ({
    avianca: 60 + i * 4 + (i % 3) * 8,
    latam: 28 + i * 2 + ((i + 1) % 4) * 4,
    wingo: 18 + (i % 5) * 3,
    arajet: 10 + (i % 4) * 3,
    copa: 34 + (i >= 8 ? i * 3 : 4),
  }));
  const max = Math.max(...data.map((d) => d.avianca + d.latam + d.wingo + d.arajet + d.copa));
  return (
    <div style={{ marginTop: 14, display: "flex", alignItems: "flex-end", gap: 8, height: 200, paddingLeft: 36, position: "relative" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 18, width: 30, display: "flex", flexDirection: "column", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--n500)", textAlign: "right" }}>
        <span>500</span><span>375</span><span>250</span><span>125</span><span>0</span>
      </div>
      <div style={{ position: "absolute", left: 36, right: 0, top: 0, bottom: 18, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{ borderTop: "1px dashed var(--n200)", height: 0 }} />
        ))}
      </div>
      {data.map((d, i) => {
        const total = d.avianca + d.latam + d.wingo + d.arajet + d.copa;
        const h = (total / max) * 180;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, zIndex: 1 }}>
            <div style={{ width: "100%", height: h, display: "flex", flexDirection: "column-reverse", borderRadius: "2px 2px 0 0", overflow: "hidden" }}>
              <div style={{ height: `${(d.avianca / total) * 100}%`, background: "var(--n900)" }} />
              <div style={{ height: `${(d.latam / total) * 100}%`, background: "var(--n700)" }} />
              <div style={{ height: `${(d.wingo / total) * 100}%`, background: "var(--n500)" }} />
              <div style={{ height: `${(d.arajet / total) * 100}%`, background: "var(--n300)" }} />
              <div style={{ height: `${(d.copa / total) * 100}%`, background: "var(--sa-base)" }} />
            </div>
            <div style={{ fontSize: 10, color: "var(--n500)", fontFamily: "var(--font-mono)" }}>{months[i]}</div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Sparkline — last N points, last point dotted.
// ============================================================
export function Sparkline({ data, color = "var(--n900)", accent }: { data: number[]; color?: string; accent?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const w = 100;
  const h = 100;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / (max - min || 1)) * h}`)
    .join(" ");
  const last = data.length - 1;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height="100%">
      <polyline fill="none" stroke={accent || color} strokeWidth="1.5" points={pts} vectorEffect="non-scaling-stroke" />
      <circle
        cx={(last / (data.length - 1)) * w}
        cy={h - ((data[last] - min) / (max - min || 1)) * h}
        r="2.5"
        fill={accent || color}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
