"use client";

import type { CSSProperties } from "react";
import { motion } from "motion/react";
import Link from "next/link";
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
import type { KpiVM } from "@/lib/demo-cases";

const MONTHS = ["Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic", "Ene", "Feb"];

const card: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--r-md)",
  boxShadow: "var(--sh-1)",
};

const ease = [0.2, 0.7, 0.3, 1] as const;

const DEFAULT_HERO = { title: "Cartagena, en el aire", titleEm: "de cuatro aerolíneas.", subtitle: "2.418 piezas analizadas entre el 1 de marzo y el 30 de abril de 2026." };

export function Overview({
  competitors,
  insights,
  run,
  analysis,
  hero = DEFAULT_HERO,
  kpis,
  breadcrumb,
  runMeta,
  caseSlug,
}: OverviewData & {
  analysis?: AnalysisVM | null;
  hero?: { title: string; titleEm: string; subtitle: string };
  kpis?: KpiVM[];
  breadcrumb?: string[];
  runMeta?: string;
  caseSlug?: string;
}) {
  const donutPalette: AvailableChartColorsKeys[] = ["ink", "graphite", "taupe", "sand"];
  let gi = 0;
  const donutData = competitors.map((c) => ({ name: c.name, sov: Number(c.sov.replace(",", ".")) || 0 }));
  const donutColors: AvailableChartColorsKeys[] = competitors.map((c) =>
    c.isClient ? "sangria" : donutPalette[gi++ % donutPalette.length],
  );

  // Charts derived from the case competitors so they always match the brands shown.
  const mNum = (s: string) => parseInt(s.replace(/\D/g, ""), 10) || 40;
  let vi = 0;
  const volumeCategories = competitors.map((c) => c.name);
  const volumeColors: AvailableChartColorsKeys[] = competitors.map((c) => (c.isClient ? "sangria" : donutPalette[vi++ % donutPalette.length]));
  const volume = MONTHS.map((month, i) => {
    const row: Record<string, string | number> = { month };
    competitors.forEach((c, ci) => {
      const base = mNum(c.mentions) / 12;
      row[c.name] = Math.round(base * (0.7 + 0.5 * Math.abs(Math.sin(i * 0.6 + ci))) + ci);
    });
    return row;
  });
  const client = competitors.find((c) => c.isClient) ?? competitors[competitors.length - 1];
  const clientName = client?.name ?? "Cliente";
  const trend = MONTHS.map((month, i) => ({ month, [clientName]: Math.round((mNum(client?.mentions ?? "40") / 12) * (0.6 + 0.5 * Math.abs(Math.sin(i * 0.5))) + i) }));

  const kpiList: KpiVM[] = kpis ?? [
    { label: "Menciones · 60d", value: "2.418", delta: "+12,4%", up: true, spark: true },
    { label: "Engagement total", value: "842k", delta: "+8,1%", up: true, spark: true },
    { label: "Share of voice · cliente", value: "9,9%", tone: "ink", bar: 9.9 },
    { label: "Inversión paga estimada", value: "USD 28k", delta: "+34%", up: true, spark: true },
  ];

  return (
    <ScreenShell
      breadcrumb={breadcrumb ?? ["Proyectos", "Cartagena · Q2 2026"]}
      badges={<><BBBadge tone="success" size="sm">activo</BBBadge> <BBBadge tone="accent" size="sm">v2.3</BBBadge></>}
      runMeta={runMeta ?? `run #${String(run.number).padStart(3, "0")}`}
      caseSlug={caseSlug}
    >
      {/* Hero header */}
      <div className="bb-row" style={{ display: "flex", alignItems: "flex-end", gap: 20, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <div className="t-micro" style={{ color: "var(--accent)" }}>BENCHMARK · 60 DÍAS · {competitors.length} COMPETIDORES</div>
          <h1 className="t-display" style={{ marginTop: 8, marginBottom: 6, fontSize: 44, lineHeight: "48px", letterSpacing: "-0.025em", color: "var(--text)" }}>
            {hero.title} <em style={{ fontFamily: "var(--font-serif)", fontWeight: 500, fontStyle: "italic", color: "var(--text-muted)" }}>{hero.titleEm}</em>
          </h1>
          <div className="t-body" style={{ color: "var(--text-muted)", maxWidth: 640 }}>{hero.subtitle}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/reporte"><Btn kind="secondary" icon={<Ic.download s={12} />}>PDF</Btn></Link>
          <Link href="/editor"><Btn kind="accent" iconRight={<Ic.arrow s={12} />}>Generar reporte</Btn></Link>
        </div>
      </div>

      {analysis && (
        <div style={{ marginBottom: 18 }}>
          <AnalysisBlock analysis={analysis} />
        </div>
      )}

      {/* KPIs (animated entrance) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 18 }}>
        {kpiList.map((k, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, delay: i * 0.06, ease }}>
            <KPI label={k.label} value={k.value} delta={k.delta} up={k.up} spark={k.spark} bar={k.bar} tone={k.tone} />
          </motion.div>
        ))}
      </div>

      {/* Body grid: volume chart + insights/cost */}
      <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14 }}>
        <div style={{ ...card, padding: 18 }}>
          <div className="t-h3" style={{ color: "var(--text)" }}>Volumen por competidor</div>
          <div className="t-micro" style={{ marginTop: 4 }}>menciones · últimos 12 períodos</div>
          <BarChart
            data={volume}
            index="month"
            categories={volumeCategories}
            colors={volumeColors}
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
      <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
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
          <div className="t-h3" style={{ color: "var(--text)" }}>Tendencia · {clientName}</div>
          <div className="t-micro" style={{ marginTop: 4 }}>menciones del cliente · últimos 12 períodos</div>
          <AreaChart
            data={trend}
            index="month"
            categories={[clientName]}
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
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
