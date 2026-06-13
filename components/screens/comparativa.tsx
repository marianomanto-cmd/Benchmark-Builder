"use client";

import type { ReactNode } from "react";
import { ScreenShell } from "@/components/shell/screen-shell";
import { Ic } from "@/components/ui/icons";
import { Btn, SentimentChip } from "@/components/ui/primitives";
import { PlatformBadge } from "@/components/domain";
import type { PlatformKey, SentimentKind } from "@/lib/platforms";

const cols = [
  { name: "Avianca", brand: "A", accent: "var(--series-1)", isClient: false },
  { name: "LATAM", brand: "L", accent: "var(--series-2)", isClient: false },
  { name: "Wingo", brand: "W", accent: "var(--series-3)", isClient: false },
  { name: "Arajet", brand: "J", accent: "var(--series-4)", isClient: false },
  { name: "Copa", brand: "C", accent: "var(--series-client)", isClient: true },
];

type RowFmt = "mono" | "bar" | "plats" | "sent" | "text";
const rows: { label: string; vals: (string | number)[]; fmt: RowFmt }[] = [
  { label: "Menciones · 60d", vals: ["998", "581", "312", "287", "240"], fmt: "mono" },
  { label: "Engagement total", vals: ["412k", "264k", "198k", "142k", "188k"], fmt: "mono" },
  { label: "Reach estimado", vals: ["1,8M", "1,1M", "680k", "420k", "520k"], fmt: "mono" },
  { label: "Share of voice", vals: ["41,3%", "24,0%", "12,9%", "11,9%", "9,9%"], fmt: "bar" },
  { label: "Plataformas activas", vals: [5, 4, 3, 3, 4], fmt: "plats" },
  { label: "Sentimiento dominante", vals: ["pos", "mix", "neu", "neu", "pos"], fmt: "sent" },
  { label: "Inversión paga · est.", vals: ["USD 18–28k", "USD 10–14k", "—", "—", "USD 5–8k"], fmt: "mono" },
  { label: "Top contenido", vals: ["Sunset reel", "POV TikTok", "Vlog 48h", "Tarifa promo", "Atardecer post"], fmt: "text" },
  { label: "Frecuencia · post/sem", vals: ["12,4", "7,8", "4,2", "3,8", "3,1"], fmt: "mono" },
];

const platsByCol: PlatformKey[][] = [
  ["instagram", "tiktok", "youtube", "x", "meta_ads"],
  ["instagram", "facebook", "x", "meta_ads"],
  ["instagram", "tiktok", "facebook"],
  ["instagram", "x", "web"],
  ["instagram", "youtube", "x", "meta_ads"],
];

export function Comparativa() {
  return (
    <ScreenShell breadcrumb={["Proyectos", "Cartagena · Q2 2026", "Comparativa"]} runMeta="5 competidores · vista lado a lado">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <div>
          <div className="t-micro" style={{ color: "var(--accent)" }}>COMPARATIVA · LADO A LADO</div>
          <div className="t-h1" style={{ marginTop: 6, color: "var(--text)" }}>Una matriz para entender la competencia</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn kind="secondary" size="sm" icon={<Ic.download s={11} />}>CSV</Btn>
          <Btn kind="secondary" size="sm" icon={<Ic.copy s={11} />}>Insertar en reporte</Btn>
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", overflow: "hidden", boxShadow: "var(--sh-1)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: 500, fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)", fontFamily: "var(--font-mono)", borderBottom: "1px solid var(--border)", width: 200 }}>Métrica</th>
              {cols.map((c, i) => (
                <th key={i} style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", borderLeft: "1px solid var(--border)", background: c.isClient ? "var(--accent-soft)" : "transparent", textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "var(--r-sm)", background: c.accent, color: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 13 }}>{c.brand}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: c.isClient ? "var(--accent)" : "var(--text)" }}>{c.name}</div>
                      {c.isClient && <div style={{ fontSize: 9, color: "var(--accent)", fontFamily: "var(--font-mono)", letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 500 }}>· CLIENTE</div>}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={{ padding: "14px 16px", fontWeight: 500, color: "var(--text-muted)", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>{r.label}</td>
                {r.vals.map((v, j) => {
                  const isClient = cols[j].isClient;
                  let cell: ReactNode = v;
                  if (r.fmt === "mono") cell = <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 500, color: "var(--text)" }}>{v}</span>;
                  else if (r.fmt === "sent") cell = <SentimentChip kind={v as SentimentKind} big />;
                  else if (r.fmt === "bar") {
                    const num = parseFloat(String(v));
                    cell = (
                      <div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 500, color: "var(--text)" }}>{v}</div>
                        <div style={{ height: 6, background: "var(--surface-2)", borderRadius: 3, marginTop: 6 }}>
                          <div style={{ width: `${num * 2}%`, height: "100%", background: cols[j].accent, borderRadius: 3 }} />
                        </div>
                      </div>
                    );
                  } else if (r.fmt === "plats") {
                    cell = <div style={{ display: "flex", gap: 4 }}>{platsByCol[j].map((p) => <PlatformBadge key={p} platform={p} size="sm" />)}</div>;
                  } else if (r.fmt === "text") {
                    cell = <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{v}</span>;
                  }
                  return (
                    <td key={j} style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", borderLeft: "1px solid var(--border)", background: isClient ? "var(--accent-soft)" : "transparent" }}>{cell}</td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScreenShell>
  );
}
