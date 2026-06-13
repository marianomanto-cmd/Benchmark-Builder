"use client";

import type { CSSProperties } from "react";
import { motion } from "motion/react";
import { ScreenShell } from "@/components/shell/screen-shell";
import { Ic } from "@/components/ui/icons";
import { Btn, BBBadge, KPI } from "@/components/ui/primitives";
import { CompetitorCard, CostMeter, MiniInsight } from "@/components/domain";
import { AnalysisBlock } from "@/components/analysis-block";
import { BarChart } from "@/components/tremor/BarChart";
import { DonutChart } from "@/components/tremor/DonutChart";
import { AreaChart } from "@/components/tremor/AreaChart";
import type { AvailableChartColorsKeys } from "@/components/tremor/utils/chartColors";
import { formatInt, formatPercent } from "@/lib/format";
import type { OverviewData, AnalysisVM } from "@/lib/view-models";

const MONTHS = ["Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic", "Ene", "Feb"];

const VOLUME = MONTHS.map((month, i) => ({
  month,
  Avianca: 60 + i * 4 + (i % 3) * 8,
  LATAM: 28 + i * 2 + ((i + 1) % 4) * 4,
  Wingo: 18 + (i % 5) * 3,
  Arajet: 10 + (i % 4) * 3,
  Copa: 34 + (i >= 8 ? i * 3 : 4),
}));

const TREND = MONTHS.map((month, i) => ({ month, Copa: Math.round(20 + Math.sin(i * 0.6) * 8 + i * 1.6) }));

const VOLUME_CATEGORIES = ["Avianca", "LATAM", "Wingo", "Arajet", "Copa"];
const VOLUME_COLORS: AvailableChartColorsKeys[] = ["ink", "graphite", "taupe", "sand", "sangria"];

const card: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--r-md)",
  boxShadow: "var(--sh-1)",
};

const ease = [0.2, 0.7, 0.3, 1] as const;

export function Overview({ competitors, insights, run, analysis }: OverviewData & { analysis?: AnalysisVM | null }) {
  const donutPalette: AvailableChartColorsKeys[] = ["ink", "graphite", "taupe", "sand"];
  let gi = 0;
  const donutData = competitors.map((c) => ({ name: c.name, sov: Number(c.sov.replace(",", ".")) || 0 }));
  const donutColors: AvailableChartColorsKeys[] = competitors.map((c) =>
    c.isClient ? "sangria" : donutPalette[gi++ % donutPalette.length],
  );

  return (
    <ScreenShell
      breadcrumb={["Proyectos", "Cartagena · Q2 2026"]}
      badges={<><BBBadge tone="success" size="sm">activo</BBBadge> <BBBadge tone="accent" size="sm">v2.3</BBBadge></>}
      runMeta={`run #${String(run.number).padStart(3, "0")} · hace 12 min · USD 1,84`}
    >
      {/* Hero header */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 20, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <div className="t-micro" style={{ color: "var(--accent)" }}>BENCHMARK · 60 DÍAS · {competitors.length} COMPETIDORES</div>
          <h1 className="t-display" style={{ marginTop: 8, marginBottom: 6, fontSize: 44, lineHeight: "48px", letterSpacing: "-0.025em", color: "var(--text)" }}>
            Cartagena, en el aire <em style={{ fontFamily: "var(--font-serif)", fontWeight: 500, fontStyle: "italic", color: "var(--text-muted)" }}>de cuatro aerolíneas.</em>
          </h1>
          <div className="t-body" style={{ color: "var(--text-muted)", maxWidth: 640 }}>2.418 piezas analizadas entre el 1 de marzo y el 30 de abril de 2026 · IG · TT · YT · X · Reddit · Web · Meta Ads.</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn kind="secondary" icon={<Ic.download s={12} />}>PDF</Btn>
          <Btn kind="accent" iconRight={<Ic.arrow s={12} />}>Generar reporte</Btn>
        </div>
      </div>

      {analysis && (
        <div style={{ marginBottom: 18 }}>
          <AnalysisBlock analysis={analysis} />
        </div>
      )}

      {/* KPIs (animated entrance) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 18 }}>
        {[
          <KPI key="m" label="Menciones · 60d" value="2.418" delta="+12,4%" up spark />,
          <KPI key="e" label="Engagement total" value="842k" delta="+8,1%" up spark />,
          <KPI key="s" label="Share of voice · cliente" value="9,9%" tone="ink" bar={9.9} />,
          <KPI key="i" label="Inversión paga estimada" value="USD 28k" delta="+34%" up spark />,
        ].map((node, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, delay: i * 0.06, ease }}>
            {node}
          </motion.div>
        ))}
      </div>

      {/* Body grid: volume chart + insights/cost */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14 }}>
        <div style={{ ...card, padding: 18 }}>
          <div className="t-h3" style={{ color: "var(--text)" }}>Volumen por competidor</div>
          <div className="t-micro" style={{ marginTop: 4 }}>menciones · marzo–abril 2026</div>
          <BarChart
            data={VOLUME}
            index="month"
            categories={VOLUME_CATEGORIES}
            colors={VOLUME_COLORS}
            type="stacked"
            valueFormatter={(v) => formatInt(v)}
            showLegend
            className="mt-3 h-60"
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ ...card, padding: 16 }}>
            <div className="t-micro">Insights destacados</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
              {insights.map((it, idx) => (
                <MiniInsight key={idx} kind={it.kind} t={it.title} s={`${it.sources} fuentes · ${it.confidence}`} />
              ))}
            </div>
          </div>
          <CostMeter used={run.used} soft={run.soft} hard={run.hard} period={`run #${String(run.number).padStart(3, "0")}`} />
        </div>
      </div>

      {/* SOV donut + trend area */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
        <div style={{ ...card, padding: 18 }}>
          <div className="t-h3" style={{ color: "var(--text)" }}>Share of voice</div>
          <div className="t-micro" style={{ marginTop: 4 }}>participación de menciones · 60 días</div>
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 6 }}>
            <DonutChart
              data={donutData}
              category="name"
              value="sov"
              colors={donutColors}
              valueFormatter={(v) => formatPercent(v)}
              showLabel
              className="h-40 w-40"
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              {competitors.map((c) => (
                <div key={c.handle} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: c.accent }} />
                  <span style={{ color: "var(--text)", flex: 1 }}>{c.name}</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{c.sov} %</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ ...card, padding: 18 }}>
          <div className="t-h3" style={{ color: "var(--text)" }}>Tendencia · Copa</div>
          <div className="t-micro" style={{ marginTop: 4 }}>menciones del cliente · últimos 12 períodos</div>
          <AreaChart
            data={TREND}
            index="month"
            categories={["Copa"]}
            colors={["sangria"]}
            valueFormatter={(v) => formatInt(v)}
            showLegend={false}
            fill="gradient"
            className="mt-3 h-44"
          />
        </div>
      </div>

      {/* Competitor strip */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <div className="t-h3" style={{ color: "var(--text)" }}>Competidores</div>
          <a style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500 }}>Ver todos →</a>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${competitors.length}, 1fr)`, gap: 12 }}>
          {competitors.map((c, i) => (
            <motion.div key={c.handle} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, delay: i * 0.05, ease }}>
              <CompetitorCard name={c.name} handle={c.handle} brand={c.brandLetter} accent={c.accent} platforms={c.platforms} mentions={c.mentions} sov={c.sov} sent={c.sentiment} sparkData={c.sparkData} />
            </motion.div>
          ))}
        </div>
      </div>
    </ScreenShell>
  );
}
