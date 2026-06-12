"use client";

import { ScreenShell } from "@/components/shell/screen-shell";
import { Ic } from "@/components/ui/icons";
import { Btn, BBBadge, KPI } from "@/components/ui/primitives";
import { BBBarChart } from "@/components/ui/charts";
import { CompetitorCard, CostMeter, MiniInsight } from "@/components/domain";
import type { PlatformKey, SentimentKind } from "@/lib/platforms";

const COMPETITORS: [string, string, string, string, PlatformKey[], string, string, SentimentKind][] = [
  ["Avianca", "avianca", "A", "var(--n900)", ["instagram", "tiktok", "youtube", "x", "meta_ads"], "998", "41,3", "pos"],
  ["LATAM Colombia", "latamcol", "L", "var(--n700)", ["instagram", "facebook", "x", "meta_ads"], "581", "24,0", "mix"],
  ["Wingo", "wingo.col", "W", "var(--n500)", ["instagram", "tiktok", "facebook"], "312", "12,9", "neu"],
  ["Arajet", "arajetdom", "J", "var(--n400)", ["instagram", "x", "web"], "287", "11,9", "neu"],
  ["Copa Airlines", "copaairlines", "C", "var(--sa-base)", ["instagram", "youtube", "x", "meta_ads"], "240", "9,9", "pos"],
];

export function Overview() {
  return (
    <ScreenShell
      breadcrumb={["Proyectos", "Cartagena · Q2 2026"]}
      badges={<><BBBadge tone="success" size="sm">activo</BBBadge> <BBBadge tone="accent" size="sm">v2.3</BBBadge></>}
      runMeta="run #042 · hace 12 min · USD 1,84"
    >
      {/* Tabs */}
      <div style={{ display: "flex", gap: 24, borderBottom: "1px solid var(--n200)", marginBottom: 20 }}>
        {["Overview", "Setup", "Runs · 4", "Live feed", "Competidores", "Reportes · 2"].map((t, i) => (
          <div key={t} style={{ padding: "8px 0", fontSize: 13, fontWeight: i === 0 ? 500 : 400, color: i === 0 ? "var(--n900)" : "var(--n600)", borderBottom: i === 0 ? "2px solid var(--sa-base)" : "2px solid transparent", marginBottom: -1 }}>{t}</div>
        ))}
        <div style={{ flex: 1 }} />
        <Btn kind="ghost" size="sm" icon={<Ic.copy s={11} />}>Duplicar proyecto</Btn>
      </div>

      {/* Hero header */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 20, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <div className="t-micro" style={{ color: "var(--sa-base)" }}>BENCHMARK · 60 DÍAS · 5 COMPETIDORES</div>
          <h1 className="t-display" style={{ marginTop: 8, marginBottom: 6, fontSize: 44, lineHeight: "48px", letterSpacing: "-0.025em" }}>
            Cartagena, en el aire <em style={{ fontFamily: "var(--font-serif)", fontWeight: 500, fontStyle: "italic", color: "var(--n700)" }}>de cuatro aerolíneas.</em>
          </h1>
          <div className="t-body" style={{ color: "var(--n600)", maxWidth: 640 }}>2.418 piezas analizadas entre el 1 de marzo y el 30 de abril de 2026 · IG · TT · YT · X · Reddit · Web · Meta Ads.</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn kind="secondary" icon={<Ic.download s={12} />}>PDF</Btn>
          <Btn kind="accent" iconRight={<Ic.arrow s={12} />}>Generar reporte</Btn>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 18 }}>
        <KPI label="Menciones · 60d" value="2.418" delta="+12,4%" up spark />
        <KPI label="Engagement total" value="842k" delta="+8,1%" up spark />
        <KPI label="Share of voice · cliente" value="9,9%" tone="ink" bar={9.9} />
        <KPI label="Inversión paga estimada" value="USD 28k" delta="+34%" up spark />
      </div>

      {/* Body grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14 }}>
        <div style={{ background: "#fff", border: "1px solid var(--n200)", borderRadius: "var(--r-md)", padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div className="t-h3">Volumen por competidor</div>
              <div className="t-micro" style={{ marginTop: 4 }}>menciones · marzo–abril 2026</div>
            </div>
            <div style={{ display: "flex", border: "1px solid var(--n200)", borderRadius: "var(--r-sm)", overflow: "hidden" }}>
              {["7d", "30d", "60d", "YTD"].map((r, i) => (
                <div key={r} style={{ padding: "5px 10px", fontSize: 11, fontFamily: "var(--font-mono)", background: i === 2 ? "var(--n900)" : "#fff", color: i === 2 ? "#fff" : "var(--n700)", borderLeft: i ? "1px solid var(--n200)" : "none" }}>{r}</div>
              ))}
            </div>
          </div>
          <BBBarChart />
          <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
            {([["Avianca", "var(--n900)"], ["LATAM", "var(--n700)"], ["Wingo", "var(--n500)"], ["Arajet", "var(--n300)"], ["Copa", "var(--sa-base)"]] as [string, string][]).map(([n, c]) => (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--n700)" }}>
                <span style={{ width: 9, height: 9, background: c, borderRadius: 1 }} />{n}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "#fff", border: "1px solid var(--n200)", borderRadius: "var(--r-md)", padding: 16 }}>
            <div className="t-micro">Insights destacados</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
              <MiniInsight kind="opp" t="LATAM no usa TikTok orgánico" s="38 fuentes · 0,87" />
              <MiniInsight kind="thr" t="Avianca duplicó spend en Meta" s="14 fuentes · 0,79" />
              <MiniInsight kind="pat" t="Picos jueves 11h" s="62 fuentes · 0,92" />
            </div>
          </div>
          <CostMeter used={42.18} soft={50} hard={75} period="run #042" />
        </div>
      </div>

      {/* Competitor strip */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <div className="t-h3">Competidores</div>
          <a style={{ fontSize: 12, color: "var(--sa-base)", fontWeight: 500 }}>Ver todos →</a>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {COMPETITORS.map((c, i) => (
            <CompetitorCard key={i} name={c[0]} handle={c[1]} brand={c[2]} accent={c[3]} platforms={c[4]} mentions={c[5]} sov={c[6]} sent={c[7]} sparkData={Array.from({ length: 14 }, (_, j) => Math.sin(j * 0.7 + i) * 8 + 12 + j * 1.2)} />
          ))}
        </div>
      </div>
    </ScreenShell>
  );
}
