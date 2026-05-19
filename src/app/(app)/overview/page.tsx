/**
 * Overview (01) — handoff §4.1.
 * Hero header · KPI row (4 tiles, uno tone='ink') · body grid 2/3 chart + 1/3
 * insights + cost meter · competitor strip 5 cards.
 */

import { Btn, KPI } from "@/components/ui";
import { CompetitorCard, InsightCard, CostMeter } from "@/components/domain";
import { BBBarChart } from "@/components/charts/bb-bar-chart";
import { COMPETITORS } from "@/lib/fixtures/competitors";
import { OVERVIEW_KPIS } from "@/lib/fixtures/kpis";
import { OVERVIEW_INSIGHTS } from "@/lib/fixtures/insights";

const TABS = [
  { key: "overview", label: "Resumen", active: true },
  { key: "setup", label: "Setup" },
  { key: "runs", label: "Runs · 4" },
  { key: "feed", label: "Live feed" },
  { key: "competitors", label: "Competidores" },
  { key: "reports", label: "Reportes · 2" },
];

export default function OverviewPage() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto flex flex-col gap-6">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-n-200 -mx-6 px-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={
              t.active
                ? "px-3 py-2.5 text-[13px] font-medium text-sa-base relative"
                : "px-3 py-2.5 text-[13px] font-medium text-n-500 hover:text-n-900 transition"
            }
          >
            {t.label}
            {t.active && <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-sa-base rounded-t-sm" />}
          </button>
        ))}
      </div>

      {/* Hero */}
      <header className="flex items-end justify-between gap-6">
        <div className="max-w-2xl">
          <div className="t-micro text-sa-base mb-2">PROYECTO · ACTIVO</div>
          <h1 className="t-display mb-2">
            Cartagena Q3 — Copa vs <span className="t-serif italic text-n-700 font-medium">cuatro</span>.
          </h1>
          <p className="t-body text-n-600">
            Inteligencia competitiva sobre la ruta Cartagena: Avianca, LATAM, Wingo, Arajet vs Copa
            Airlines. Datos sintéticos para Fase 1; en Fase 2 entran fuentes reales.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Btn kind="secondary" size="md">
            Exportar PDF
          </Btn>
          <Btn kind="accent" size="md">
            Generar reporte
          </Btn>
        </div>
      </header>

      {/* KPI row */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {OVERVIEW_KPIS.map((k) => (
          <KPI
            key={k.label}
            label={k.label}
            numericValue={k.numericValue}
            formatKind={k.formatKind}
            delta={k.delta}
            up={k.up}
            sparkData={k.sparkData}
            bar={k.bar}
            tone={k.tone}
          />
        ))}
      </section>

      {/* Body grid: chart (2/3) + insights/cost (1/3) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white border border-n-200 rounded-md p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="t-micro">Volumen · 12 meses</div>
              <div className="t-h2 mt-0.5">Menciones por marca</div>
            </div>
            <div className="flex gap-1 text-[11px] text-n-500">
              {["7d", "30d", "60d", "YTD"].map((p, i) => (
                <button
                  key={p}
                  className={
                    i === 2
                      ? "px-2 py-1 rounded-sm bg-n-100 text-n-900 font-medium"
                      : "px-2 py-1 rounded-sm hover:bg-n-50 transition"
                  }
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <BBBarChart height={260} />
        </div>

        {/* Side: insights + cost */}
        <div className="flex flex-col gap-4">
          <div className="t-h2">Insights destacados</div>
          <div className="flex flex-col gap-3">
            {OVERVIEW_INSIGHTS.slice(0, 2).map((ins, i) => (
              <InsightCard
                key={i}
                kind={ins.kind}
                title={ins.title}
                body={ins.body}
                sources={ins.sources}
                confidence={ins.confidence}
                index={i}
              />
            ))}
          </div>
          <CostMeter used={1.84} soft={3.5} hard={5} period="run #042" live />
        </div>
      </section>

      {/* Competitor strip */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="t-h2">Competidores</h2>
          <span className="t-mono text-[11px] text-n-500">{COMPETITORS.length} marcas</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {COMPETITORS.map((c) => (
            <CompetitorCard
              key={c.id}
              name={c.name}
              handle={c.handle}
              brand={c.brand}
              accent={c.accent}
              platforms={c.platforms}
              mentions={c.mentionsLabel}
              sov={c.sovLabel}
              sent={c.sent}
              sparkData={c.sparkData}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
