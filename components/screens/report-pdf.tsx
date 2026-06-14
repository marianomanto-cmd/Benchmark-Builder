"use client";

import { Fragment } from "react";
import { BBBarChart } from "@/components/ui/charts";

// 07.7 Report PDF (US Letter portrait) — the deliverable. Standalone (no shell).
const tableRows: [string, string, string][] = [
  ["Avianca", "998", "41,3 %"],
  ["LATAM Colombia", "581", "24,0 %"],
  ["Wingo", "312", "12,9 %"],
  ["Arajet", "287", "11,9 %"],
  ["Copa Airlines", "240", "9,9 %"],
];

export function ReportPDF() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-2)", display: "flex", justifyContent: "center", padding: 24 }}>
      <div style={{ width: 816, minHeight: 1056, background: "#fff", boxShadow: "var(--sh-4)", padding: "72px 88px", position: "relative", fontFamily: "var(--font-serif)", color: "var(--n900)" }}>
        <div style={{ position: "absolute", top: 36, left: 88, right: 88, display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--n500)", fontFamily: "var(--font-mono)", letterSpacing: ".08em", textTransform: "uppercase" }}>
          <span>Phatia · Cartagena Q2 2026</span>
          <span>04 / 14</span>
        </div>
        <div style={{ position: "absolute", top: 36, left: 88, width: 6, height: 24, background: "var(--sa-base)" }} />

        <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--sa-base)", letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 600, marginTop: 8 }}>SECCIÓN 04 · VOLUMEN Y SOV</div>
        <h1 style={{ fontSize: 54, lineHeight: "58px", fontWeight: 500, letterSpacing: "-0.03em", margin: "14px 0 10px", textWrap: "balance" }}>
          Cartagena, en el aire <em style={{ fontStyle: "italic", color: "var(--n700)" }}>de cuatro aerolíneas.</em>
        </h1>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--n500)", marginBottom: 18, letterSpacing: ".04em" }}>
          Período · 1 mar – 30 abr 2026 · 5 competidores · 7 plataformas · 2.418 menciones
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 20 }}>
          <p style={{ fontSize: 14, lineHeight: "22px", margin: 0, textWrap: "pretty" }}>
            Entre el 1 de marzo y el 30 de abril de 2026, las cinco aerolíneas con presencia activa en la ruta produjeron <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>2.418</span> piezas relacionadas a Cartagena. <em>Avianca</em> concentra el <b style={{ color: "var(--sa-base)" }}>41,3 %</b> del volumen total, seguida por LATAM (24 %) y Wingo (12,9 %).
          </p>
          <p style={{ fontSize: 14, lineHeight: "22px", margin: 0, textWrap: "pretty" }}>
            Copa, en quinta posición con <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>240</span> menciones (<b>9,9 %</b>), opera con un perfil más orgánico que paid: 78 % del contenido es no-pago, frente al 62 % de Avianca. Esto sugiere una oportunidad — y un costo — de igualar la cadencia paga del líder.
          </p>
        </div>

        {/* Figure */}
        <div style={{ borderTop: "1px solid var(--n200)", borderBottom: "1px solid var(--n200)", padding: "18px 0", margin: "8px 0 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--n500)" }}>FIG. 4.1</div>
            <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--n500)" }}>fuente · run #042 · 04/05/26</div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8, letterSpacing: "-0.01em" }}>Volumen mensual por competidor (menciones)</div>
          <BBBarChart />
          <div style={{ display: "flex", gap: 14, marginTop: 8, fontFamily: "var(--font-sans)" }}>
            {([["Avianca", "var(--n900)"], ["LATAM", "var(--n700)"], ["Wingo", "var(--n500)"], ["Arajet", "var(--n300)"], ["Copa", "var(--sa-base)"]] as [string, string][]).map(([n, c]) => (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--n700)" }}>
                <span style={{ width: 9, height: 9, background: c, borderRadius: 1 }} />{n}
              </div>
            ))}
          </div>
        </div>

        {/* Pull quote */}
        <div style={{ borderLeft: "3px solid var(--sa-base)", padding: "4px 0 4px 18px", marginBottom: 22 }}>
          <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--sa-base)", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600 }}>HALLAZGO · 4.1</div>
          <div style={{ fontSize: 22, lineHeight: "30px", fontWeight: 500, marginTop: 6, letterSpacing: "-0.015em", textWrap: "balance" }}>
            El volumen de Avianca casi cuadruplica al de Copa, pero su <em>engagement</em> por pieza es sólo 1,8 × más alto.
          </div>
        </div>

        {/* Mini table */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, fontFamily: "var(--font-sans)", borderTop: "1px solid var(--n900)" }}>
          {tableRows.map((r, i) => (
            <Fragment key={i}>
              <div style={{ padding: "10px 0", fontSize: 13, borderBottom: "1px solid var(--n200)", color: r[0] === "Copa Airlines" ? "var(--sa-base)" : "var(--n900)", fontWeight: r[0] === "Copa Airlines" ? 600 : 400 }}>{r[0]}</div>
              <div style={{ padding: "10px 0", fontSize: 13, fontFamily: "var(--font-mono)", borderBottom: "1px solid var(--n200)", textAlign: "right" }}>{r[1]}</div>
              <div style={{ padding: "10px 0", fontSize: 13, fontFamily: "var(--font-mono)", borderBottom: "1px solid var(--n200)", textAlign: "right" }}>{r[2]}</div>
            </Fragment>
          ))}
        </div>

        <div style={{ position: "absolute", bottom: 36, left: 88, right: 88, display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--n400)", fontFamily: "var(--font-mono)", letterSpacing: ".08em", textTransform: "uppercase" }}>
          <span>preparado para Copa Airlines · uso interno</span>
          <span>generado con Phatia</span>
        </div>
      </div>
    </div>
  );
}
