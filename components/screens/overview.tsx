"use client";

import type { CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { ScreenShell } from "@/components/shell/screen-shell";
import { Ic } from "@/components/ui/icons";
import { Btn, BBBadge, SentimentChip } from "@/components/ui/primitives";
import { Sparkline } from "@/components/ui/charts";
import { MiniInsight } from "@/components/domain";
import { Segmented, useToggleView } from "@/components/ui/segmented";
import { BarChart } from "@/components/tremor/BarChart";
import { DonutChart } from "@/components/tremor/DonutChart";
import { AreaChart } from "@/components/tremor/AreaChart";
import type { AvailableChartColorsKeys } from "@/components/tremor/utils/chartColors";
import { formatInt } from "@/lib/format";
import type { OverviewData, AnalysisVM, CompetitorVM } from "@/lib/view-models";
import type { KpiVM } from "@/lib/demo-cases";

const MONTHS = ["Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic", "Ene", "Feb"];
const ease = [0.2, 0.7, 0.3, 1] as const;

const card: CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)" };
const panel: CSSProperties = { ...card, padding: 16 };

const DEFAULT_HERO = { title: "Cartagena, en el aire", titleEm: "de cuatro aerolíneas.", subtitle: "2.418 piezas analizadas." };
const DEFAULT_KPIS: KpiVM[] = [
  { label: "Menciones · 60d", value: "2.418", delta: "+12,4%", up: true, spark: true },
  { label: "Engagement total", value: "842k", delta: "+8,1%", up: true, spark: true },
  { label: "Share of voice · cliente", value: "9,9%", tone: "ink", bar: 9.9 },
  { label: "Inversión paga estimada", value: "USD 28k", delta: "+34%", up: true, spark: true },
];

const VIEWS = [
  { id: "informe", label: "Informe" },
  { id: "cockpit", label: "Cockpit" },
  { id: "posiciones", label: "Posiciones" },
  { id: "spread", label: "Spread" },
];

const sovNum = (c: CompetitorVM) => Number(c.sov.replace(",", ".")) || 0;
const mNum = (s: string) => parseInt(s.replace(/\D/g, ""), 10) || 40;

// Split a headline into a head + italic tail at the first ";"/":"/comma.
function emSplit(s: string): [string, string] {
  const m = s.match(/^(.*?[;:])\s+(.+)$/);
  if (m) return [m[1] + " ", m[2]];
  const i = s.indexOf(", ");
  if (i > 12) return [s.slice(0, i + 1) + " ", s.slice(i + 2)];
  return [s, ""];
}

type VM = {
  competitors: CompetitorVM[];
  insights: OverviewData["insights"];
  kpis: KpiVM[];
  analysis: AnalysisVM | null;
  hero: { title: string; titleEm: string; subtitle: string };
  clientName: string;
  volume: Record<string, string | number>[];
  volumeCategories: string[];
  volumeColors: AvailableChartColorsKeys[];
  donutData: { name: string; sov: number }[];
  donutColors: AvailableChartColorsKeys[];
  trend: Record<string, string | number>[];
  sumSov: number;
  maxSov: number;
};

export function Overview({
  competitors,
  insights,
  run,
  analysis = null,
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
  const [view, setView] = useToggleView("view", "bb:overview-view", ["informe", "cockpit", "posiciones", "spread"], "cockpit");

  const palette: AvailableChartColorsKeys[] = ["ink", "graphite", "taupe", "sand"];
  let gi = 0;
  const donutData = competitors.map((c) => ({ name: c.name, sov: sovNum(c) }));
  const donutColors: AvailableChartColorsKeys[] = competitors.map((c) => (c.isClient ? "gold" : palette[gi++ % palette.length]));

  let vi = 0;
  const volumeCategories = competitors.map((c) => c.name);
  const volumeColors: AvailableChartColorsKeys[] = competitors.map((c) => (c.isClient ? "gold" : palette[vi++ % palette.length]));
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

  const kpiList = kpis ?? DEFAULT_KPIS;
  const sumSov = Math.round(competitors.reduce((a, c) => a + sovNum(c), 0) * 10) / 10;
  const maxSov = Math.max(...competitors.map(sovNum), 1);

  const vm: VM = { competitors, insights, kpis: kpiList, analysis, hero, clientName, volume, volumeCategories, volumeColors, donutData, donutColors, trend, sumSov, maxSov };

  return (
    <ScreenShell
      breadcrumb={breadcrumb ?? ["@nav.dashboard", "Cartagena · Q2 2026"]}
      badges={<><BBBadge tone="success" size="sm">activo</BBBadge> <BBBadge tone="accent" size="sm">v2.3</BBBadge></>}
      runMeta={runMeta ?? `run #${String(run.number).padStart(3, "0")}`}
      caseSlug={caseSlug}
    >
      {/* persistent control bar */}
      <div className="bb-row" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <Segmented value={view} onChange={setView} options={VIEWS} />
        <div style={{ flex: 1 }} />
        <Link href={caseSlug ? `/reporte?case=${encodeURIComponent(caseSlug)}` : "/reporte"} style={{ textAlign: "center" }}><Btn kind="secondary" size="sm" icon={<Ic.download s={12} />}>PDF</Btn></Link>
        <Link href="/editor" style={{ textAlign: "center" }}><Btn kind="accent" size="sm" iconRight={<Ic.arrow s={12} />}>Generar reporte</Btn></Link>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease }}>
          {view === "informe" && <InformeView vm={vm} />}
          {view === "cockpit" && <CockpitView vm={vm} />}
          {view === "posiciones" && <PosicionesView vm={vm} />}
          {view === "spread" && <SpreadView vm={vm} />}
        </motion.div>
      </AnimatePresence>
    </ScreenShell>
  );
}

// ============================================================ A · Informe
function InformeView({ vm }: { vm: VM }) {
  const a = vm.analysis;
  const [head, em] = a ? emSplit(a.headline) : ["Avianca domina el volumen, pero ", "Copa lidera en eficiencia de engagement."];
  const body = a?.body ?? "";
  const recs = a?.recommendations ?? [];
  return (
    <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 22, alignItems: "start" }}>
      <div>
        <div className="t-micro" style={{ color: "var(--accent)" }}>Análisis + insights · 60 días</div>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(26px, 2.6vw, 34px)", lineHeight: 1.08, letterSpacing: "-0.02em", margin: "10px 0 14px", color: "var(--text)" }}>
          {head}<em style={{ fontStyle: "italic", color: "var(--text-muted)" }}>{em}</em>
        </h2>
        {body && <p style={{ fontSize: 14, lineHeight: "21px", color: "var(--text-muted)", margin: "0 0 18px", maxWidth: "62ch" }}>{body}</p>}
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 9 }}>
          {recs.map((r) => (
            <li key={r} style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--text)", lineHeight: "18px" }}>
              <span style={{ color: "var(--accent)", flexShrink: 0 }}>→</span> {r}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <StatStrip kpis={vm.kpis} dir="col" />
        <div style={{ ...panel, marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Share of voice</div>
            <div className="t-micro">60 días</div>
          </div>
          {vm.competitors.map((c) => (
            <HBar key={c.handle} name={c.name} color={c.accent} pct={sovNum(c)} max={vm.maxSov} client={c.isClient} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================ B · Cockpit (bento)
function CockpitView({ vm }: { vm: VM }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gridAutoRows: "minmax(118px, auto)", gap: 14 }} className="bb-bento">
      <div style={{ ...panel, gridColumn: "span 2", gridRow: "span 2", display: "flex", flexDirection: "column" }}>
        <PanelHead title="Share of voice" meta={`${vm.competitors.length} competidores`} />
        <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1 }}>
          <div style={{ position: "relative", width: 150, height: 150, flexShrink: 0 }}>
            <DonutChart data={vm.donutData} category="name" value="sov" colors={vm.donutColors} valueFormatter={(v) => `${v}%`} className="h-[150px] w-[150px]" />
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 500, color: "var(--text)" }}>{vm.sumSov.toFixed(1).replace(".", ",")}%</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", letterSpacing: ".08em" }}>{vm.competitors.length} marcas</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1, minWidth: 0 }}>
            {vm.competitors.map((c) => (
              <div key={c.handle} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: c.accent, flexShrink: 0 }} />
                <span style={{ flex: 1, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{c.sov}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ ...panel, gridColumn: "span 2", gridRow: "span 2" }}>
        <PanelHead title="Volumen por competidor" meta="12 períodos" />
        <BarChart data={vm.volume} index="month" categories={vm.volumeCategories} colors={vm.volumeColors} type="stacked" valueFormatter={(v) => formatInt(v)} showLegend className="mt-2 h-52" />
      </div>

      <BentoKpi k={vm.kpis[0]} />
      <BentoKpi k={vm.kpis[1]} />

      <div style={{ ...panel, gridColumn: "span 2" }}>
        <div className="t-micro" style={{ marginBottom: 10 }}>Insights destacados</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {vm.insights.map((it) => (
            <MiniInsight key={it.title} kind={it.kind} t={it.title} s={`${it.sources} fuentes · conf ${it.confidence}`} />
          ))}
        </div>
      </div>

      {vm.kpis[2] && <BentoKpi k={vm.kpis[2]} />}
      {vm.kpis[3] && <BentoKpi k={vm.kpis[3]} accent />}

      <div style={{ ...panel, gridColumn: "span 2" }}>
        <PanelHead title={`Tendencia · ${vm.clientName}`} meta="menciones cliente" />
        <AreaChart data={vm.trend} index="month" categories={[vm.clientName]} colors={["gold"]} valueFormatter={(v) => formatInt(v)} showLegend={false} fill="gradient" className="mt-2 h-28" />
      </div>
    </div>
  );
}

// ============================================================ C · Posiciones (leaderboard)
function PosicionesView({ vm }: { vm: VM }) {
  const ranked = [...vm.competitors].sort((a, b) => sovNum(b) - sovNum(a));
  const a = vm.analysis;
  const recs = a?.recommendations ?? [];
  return (
    <div>
      <StatStrip kpis={vm.kpis} dir="row" />
      <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 22, alignItems: "start", marginTop: 18 }}>
        <div style={{ ...card, padding: "8px 8px 4px", overflowX: "auto" }} className="bb-scroll-x">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["#", "Competidor", "Share of voice", "Menc.", "Tendencia", "Sentim."].map((h, i) => (
                  <th key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)", textAlign: i >= 3 ? "right" : "left", padding: "0 12px 10px", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranked.map((c, i) => (
                <tr key={c.handle} style={{ background: c.isClient ? "color-mix(in srgb, var(--accent) 7%, transparent)" : "transparent" }}>
                  <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: 16, color: c.isClient ? "var(--accent)" : "var(--text-faint)", width: 34 }}>{i + 1}</td>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                      <span style={{ width: 32, height: 32, borderRadius: 8, background: c.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: 13, flexShrink: 0 }}>{c.brandLetter}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{c.name}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>@{c.handle}</div>
                      </div>
                    </div>
                  </td>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 180 }}>
                      <div style={{ flex: 1, height: 8, borderRadius: 4, background: "color-mix(in srgb, var(--text) 8%, transparent)", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 4, width: `${((sovNum(c) / vm.maxSov) * 100).toFixed(0)}%`, background: c.accent, transition: "width 1s cubic-bezier(.7,.02,.2,1)" }} />
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, width: 46, color: "var(--text)" }}>{c.sov}%</span>
                    </div>
                  </td>
                  <td style={{ ...td, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text)" }}>{c.mentions}</td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <span style={{ display: "inline-block", width: 84, height: 24 }}><Sparkline data={c.sparkData} accent={c.isClient ? "var(--accent)" : "var(--series-2)"} /></span>
                  </td>
                  <td style={{ ...td, textAlign: "right" }}><SentimentChip kind={c.sentiment} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={panel}>
            <div className="t-micro" style={{ color: "var(--accent)", marginBottom: 8 }}>✦ Lectura</div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 17, fontWeight: 500, lineHeight: 1.3, color: "var(--text)", marginBottom: 8 }}>{a?.takeaways?.[0] ?? a?.headline ?? "—"}</div>
            <p style={{ fontSize: 13, lineHeight: "19px", color: "var(--text-muted)", margin: 0 }}>{a?.body ?? ""}</p>
          </div>
          {recs.length > 0 && (
            <div style={panel}>
              <div className="t-micro" style={{ marginBottom: 10 }}>Movés primero</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {recs.slice(0, 2).map((r, i) => (
                  <MiniInsight key={r} kind={i === 0 ? "opp" : "pat"} t={r} s={i === 0 ? "nicho abierto" : "cerrar brecha"} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================ D · Spread (editorial)
function SpreadView({ vm }: { vm: VM }) {
  const a = vm.analysis;
  const [qh, qe] = a ? emSplit(a.headline) : ["Avianca lidera el volumen; ", "Copa gana la pieza."];
  const ann = vm.insights.slice(0, 3).map((it) => it.title);
  const annPos: CSSProperties[] = [
    { top: "8%", left: "5%" },
    { top: "4%", right: "5%" },
    { bottom: "16%", left: "38%" },
  ];
  return (
    <div>
      <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 30, alignItems: "end", marginBottom: 22 }}>
        <div>
          <div className="t-micro" style={{ color: "var(--accent)" }}>Benchmark · 60 días · {vm.competitors.length} competidores</div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(30px, 3.4vw, 46px)", lineHeight: 1.0, letterSpacing: "-0.025em", margin: "8px 0 0", color: "var(--text)" }}>
            {vm.hero.title} <em style={{ fontStyle: "italic", color: "var(--text-muted)" }}>{vm.hero.titleEm}</em>
          </h2>
        </div>
        <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 17, lineHeight: 1.4, color: "var(--text-muted)", borderLeft: "2px solid var(--accent)", paddingLeft: 16 }}>
          {qh}<b style={{ color: "var(--text)", fontStyle: "normal", fontWeight: 500 }}>{qe}</b>
        </div>
      </div>

      <StatLine kpis={vm.kpis} />

      <div style={{ ...panel, marginTop: 4 }}>
        <PanelHead title="Volumen de conversación por competidor" meta="" />
        <div style={{ position: "relative" }}>
          <BarChart data={vm.volume} index="month" categories={vm.volumeCategories} colors={vm.volumeColors} type="stacked" valueFormatter={(v) => formatInt(v)} showLegend className="mt-1 h-72" />
          {/* Floating annotations only on wider screens — on mobile they'd overlap
              the bars, so they move to a stacked caption list below the chart. */}
          {ann.map((text, i) => (
            <div key={text} className="bb-hide-sm" style={{ position: "absolute", ...annPos[i], maxWidth: 180, fontFamily: "var(--font-mono)", fontSize: 10, lineHeight: 1.3, color: "var(--text)", background: "color-mix(in srgb, var(--surface) 88%, transparent)", border: "1px solid var(--border-strong)", borderRadius: 6, padding: "6px 9px", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", boxShadow: "var(--sh-1)" }}>
              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--viz-accent)", boxShadow: "0 0 8px var(--viz-accent)", marginRight: 6 }} />
              {text}
            </div>
          ))}
        </div>
        <div className="bb-only-sm" style={{ width: "100%", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {ann.map((text) => (
            <div key={text} style={{ display: "flex", gap: 8, fontFamily: "var(--font-mono)", fontSize: 11, lineHeight: 1.35, color: "var(--text)" }}>
              <span style={{ marginTop: 5, width: 6, height: 6, borderRadius: "50%", background: "var(--viz-accent)", flexShrink: 0 }} />
              {text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================ shared bits
function PanelHead({ title, meta }: { title: string; meta?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{title}</div>
      {meta ? <div className="t-micro">{meta}</div> : null}
    </div>
  );
}

function HBar({ name, color, pct, max, client }: { name: string; color: string; pct: number; max: number; client?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 48px", alignItems: "center", gap: 12, marginTop: 11 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text)", minWidth: 0 }}>
        <span style={{ width: 9, height: 9, borderRadius: 2, background: color, flexShrink: 0 }} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
      </div>
      <div style={{ height: 10, borderRadius: 5, background: "color-mix(in srgb, var(--text) 8%, transparent)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 5, width: `${((pct / max) * 100).toFixed(0)}%`, background: color, transition: "width 1s cubic-bezier(.7,.02,.2,1)" }} />
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, textAlign: "right", color: client ? "var(--accent)" : "var(--text-muted)", fontWeight: client ? 500 : 400 }}>{pct.toFixed(1).replace(".", ",")}%</div>
    </div>
  );
}

function StatStrip({ kpis, dir }: { kpis: KpiVM[]; dir: "row" | "col" }) {
  const row = dir === "row";
  return (
    <div style={{ display: "flex", flexDirection: row ? "row" : "column", flexWrap: row ? "wrap" : "nowrap", border: "1px solid var(--border)", borderRadius: "var(--r-md)", overflow: "hidden", background: "var(--surface)" }}>
      {kpis.map((k, i) => (
        <div key={k.label} style={{ flex: row ? "1 1 150px" : "none", minWidth: row ? 150 : undefined, padding: "14px 16px", borderRight: row && i < kpis.length - 1 ? "1px solid var(--border)" : "none", borderBottom: !row && i < kpis.length - 1 ? "1px solid var(--border)" : "none" }}>
          <div style={{ fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{k.label}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 500, marginTop: 6, letterSpacing: "-0.01em", color: k.tone === "ink" ? "var(--accent)" : "var(--text)" }}>{k.value}</div>
          {k.delta && <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, marginTop: 3, color: k.up ? "var(--success)" : "var(--text-muted)" }}>{k.up ? "▲ " : ""}{k.delta}</div>}
        </div>
      ))}
    </div>
  );
}

function StatLine({ kpis }: { kpis: KpiVM[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 28, margin: "0 0 4px", padding: "16px 0", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
      {kpis.map((k) => (
        <div key={k.label}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 500, color: k.tone === "ink" ? "var(--accent)" : "var(--text)" }}>{k.value}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 3 }}>{k.label}</div>
        </div>
      ))}
    </div>
  );
}

function BentoKpi({ k, accent }: { k: KpiVM; accent?: boolean }) {
  return (
    <div style={panel}>
      <div style={{ fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{k.label}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 500, marginTop: 8, color: accent ? "var(--accent)" : "var(--text)" }}>{k.value}</div>
      {k.delta && <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, marginTop: 4, color: k.up ? "var(--success)" : "var(--text-muted)" }}>{k.up ? "▲ " : ""}{k.delta}</div>}
    </div>
  );
}

const td: CSSProperties = { padding: "13px 12px", borderTop: "1px solid var(--border)", verticalAlign: "middle" };
