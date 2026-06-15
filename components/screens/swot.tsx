"use client";

import type { CSSProperties, ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ScreenShell } from "@/components/shell/screen-shell";
import Link from "next/link";
import { Ic } from "@/components/ui/icons";
import { Btn, BBBadge } from "@/components/ui/primitives";
import { Segmented, useToggleView } from "@/components/ui/segmented";
import { RadarChart } from "@/components/ui/radar-chart";
import type { AnalysisVM } from "@/lib/view-models";
import type { RadarVM } from "@/lib/demo-cases";

// FODA / SWOT, action matrix and roadmap — four visual instruments over the same
// data, switchable with a segmented control (per the design handoff).

type Quad = { key: string; title: string; tone: string; items: string[] };
type Move = { key: string; title: string; sub: string; color: string; items: string[] };
type Horizon = { title: string; window: string; items: string[] };

const DEFAULT_SWOT: Quad[] = [
  { key: "S", title: "Fortalezas", tone: "var(--success)", items: ["Mayor engagement orgánico por pieza de la categoría.", "Sentimiento positivo sólido y estable.", "Perfil 78% orgánico: bajo costo de presencia."] },
  { key: "W", title: "Debilidades", tone: "var(--danger)", items: ["Share of voice bajo (9,9%) vs. Avianca (41,3%).", "Baja presencia en bibliotecas de anuncios.", "Casi sin TikTok orgánico."] },
  { key: "O", title: "Oportunidades", tone: "var(--info)", items: ["TikTok orgánico libre: LATAM está ausente.", "Escalar paid sin diluir el tono que funciona.", "Capitalizar el sentimiento mixto de LATAM."] },
  { key: "T", title: "Amenazas", tone: "var(--warn)", items: ["Avianca duplicó su inversión en anuncios.", "Guerra de tarifas (Wingo/Arajet por precio).", "Hilos negativos en Reddit (cambios de horario)."] },
];
const DEFAULT_MATRIX: Move[] = [
  { key: "ACT", title: "Act · actuar ya", sub: "alto impacto / control propio", color: "var(--accent)", items: ["Lanzar TikTok orgánico (POV/vlog) donde LATAM no está.", "Sumar 1–2 creativos pagos/semana para la ruta."] },
  { key: "WAIT", title: "Wait · observar", sub: "monitorear antes de mover", color: "var(--text-muted)", items: ["Evolución del spend de Avianca semana a semana.", "Nuevas rutas/lanzamientos de Arajet."] },
  { key: "REACT", title: "React · reaccionar", sub: "responder señales en curso", color: "var(--info)", items: ["Responder el hilo de Reddit de Wingo con info y compensaciones.", "Contraprogramar promos de tarifas."] },
  { key: "FALLBACK", title: "Fall back · replegar", sub: "proteger si escala el riesgo", color: "var(--warn)", items: ["Si la guerra de precios escala, competir con experiencia/bundles.", "Concentrar pauta en los segmentos de mayor retorno."] },
];
const DEFAULT_PLAN: Horizon[] = [
  { title: "Corto plazo", window: "0–30 días", items: ["Activar TikTok orgánico con 3–4 piezas POV/vlog.", "Responder el hilo negativo de Reddit.", "2 creativos pagos para la ruta a Cartagena."] },
  { title: "Mediano plazo", window: "1–3 meses", items: ["Cadencia fija martes–jueves AM.", "Testear video vs. foto y medir alcance.", "Tablero de SOV semanal."] },
  { title: "Largo plazo", window: "3–12 meses", items: ["Construir SOV sostenido sin diluir el sentimiento.", "Programa de afinidad / UGC.", "Inversión orgánico+paid atada a retorno por ruta."] },
];
const DEFAULT_RADAR: RadarVM = {
  axes: ["SOV", "Engagement", "Sentimiento", "Pauta paga", "Cadencia", "TikTok org."],
  series: [
    { name: "Copa Airlines", color: "var(--accent)", vals: [25, 90, 86, 20, 46, 10] },
    { name: "Avianca · líder", color: "var(--series-2)", vals: [95, 55, 50, 95, 82, 58] },
  ],
};

const VIEWS = [
  { id: "matriz", label: "Matriz 2×2" },
  { id: "burbuja", label: "Impacto/Control" },
  { id: "radar", label: "Radar" },
  { id: "roadmap", label: "Roadmap" },
];

const box: CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 18, boxShadow: "var(--sh-1)" };
const ease = [0.2, 0.7, 0.3, 1] as const;

function emSplit(s: string): [string, string] {
  const m = s.match(/^(.*?[;:])\s+(.+)$/);
  if (m) return [m[1] + " ", m[2]];
  const i = s.indexOf(", ");
  if (i > 12) return [s.slice(0, i + 1) + " ", s.slice(i + 2)];
  return [s, ""];
}

export function Swot({
  analysis = null,
  swot = DEFAULT_SWOT,
  matrix = DEFAULT_MATRIX,
  plan = DEFAULT_PLAN,
  radar = DEFAULT_RADAR,
  breadcrumb,
  runMeta,
  caseSlug,
}: {
  analysis?: AnalysisVM | null;
  swot?: Quad[];
  matrix?: Move[];
  plan?: Horizon[];
  radar?: RadarVM;
  breadcrumb?: string[];
  runMeta?: string;
  caseSlug?: string;
}) {
  const [view, setView] = useToggleView("foda", "bb:foda-view", ["matriz", "burbuja", "radar", "roadmap"], "matriz");

  return (
    <ScreenShell breadcrumb={breadcrumb ?? ["@nav.dashboard", "Cartagena · Q2 2026", "@shell.nav.swot"]} badges={<BBBadge tone="accent" size="sm">estrategia</BBBadge>} runMeta={runMeta ?? "generado del run actual"} caseSlug={caseSlug}>
      <div className="bb-row" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div className="t-micro" style={{ color: "var(--accent)" }}>FODA · MATRIZ · RADAR · ROADMAP</div>
        </div>
        <div style={{ flex: 1 }} />
        <Segmented value={view} onChange={setView} options={VIEWS} />
        <Link href="/editor"><Btn kind="secondary" size="sm" icon={<Ic.copy s={11} />}>Insertar en reporte</Btn></Link>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease }}>
          {view === "matriz" && <MatrizView swot={swot} analysis={analysis} />}
          {view === "burbuja" && <BurbujaView matrix={matrix} analysis={analysis} />}
          {view === "radar" && <RadarView radar={radar} swot={swot} analysis={analysis} />}
          {view === "roadmap" && <RoadmapView plan={plan} />}
        </motion.div>
      </AnimatePresence>
    </ScreenShell>
  );
}

// ============================================================ A · Matriz 2×2
function MatrizView({ swot, analysis }: { swot: Quad[]; analysis: AnalysisVM | null }) {
  const byKey = (k: string) => swot.find((q) => q.key === k);
  const ordered = [byKey("S"), byKey("O"), byKey("W"), byKey("T")].filter(Boolean) as Quad[];
  const internal = new Set(["S", "W"]);
  const [head, em] = analysis ? emSplit(analysis.headline) : ["Copa juega de ", "eficiencia, no de volumen."];
  return (
    <div>
      <p style={{ fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 500, lineHeight: 1.32, color: "var(--text)", margin: "0 0 18px", maxWidth: "62ch" }}>
        {head}<em style={{ fontStyle: "italic", color: "var(--viz-accent)" }}>{em}</em>
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "26px 1fr", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", padding: "30px 0", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text-faint)" }}>
          <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>Positivo ↑</span>
          <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>Negativo ↓</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text-faint)", padding: "0 6px" }}>
            <span>Interno · la marca →</span>
            <span style={{ textAlign: "right" }}>← Externo · el mercado</span>
          </div>
          <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 10 }}>
            {ordered.map((q) => (
              <div key={q.key} style={{ borderRadius: "var(--r-md)", padding: 16, border: `1px solid color-mix(in srgb, ${q.tone} 27%, var(--border))`, background: `color-mix(in srgb, ${q.tone} 7%, var(--surface))` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: q.tone, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700 }}>{q.title[0]}</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{q.title}</span>
                  <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-muted)" }}>{internal.has(q.key) ? "interno" : "externo"}</span>
                </div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {q.items.map((it) => (
                    <li key={it} style={{ display: "flex", gap: 9, fontSize: 13, lineHeight: "18px", color: `color-mix(in srgb, ${q.tone} 70%, var(--text))` }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", marginTop: 7, flexShrink: 0 }} />
                      <span style={{ color: "var(--text-muted)" }}>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================ B · Impacto × Control
const ZONES: Record<string, { cat: string; bg: string; border: string; color: string; cx: number; cy: number }> = {
  ACT: { cat: "act", bg: "color-mix(in srgb, var(--accent) 20%, transparent)", border: "var(--accent)", color: "var(--text)", cx: 80, cy: 78 },
  REACT: { cat: "react", bg: "color-mix(in srgb, var(--info) 16%, transparent)", border: "var(--info)", color: "var(--text)", cx: 27, cy: 74 },
  WAIT: { cat: "wait", bg: "color-mix(in srgb, var(--text) 8%, transparent)", border: "var(--text-faint)", color: "var(--text-muted)", cx: 26, cy: 28 },
  FALLBACK: { cat: "fall", bg: "color-mix(in srgb, var(--warn) 16%, transparent)", border: "var(--warn)", color: "var(--text)", cx: 80, cy: 33 },
};
const OFF = [{ dx: 4, dy: 8, r: 60 }, { dx: -13, dy: -13, r: 52 }, { dx: 14, dy: -22, r: 44 }];

function BurbujaView({ matrix, analysis }: { matrix: Move[]; analysis: AnalysisVM | null }) {
  const bubbles = matrix.flatMap((m) => {
    const z = ZONES[m.key];
    if (!z) return [];
    return m.items.slice(0, 3).map((label, i) => {
      const o = OFF[i] ?? OFF[OFF.length - 1];
      return { label, x: z.cx + o.dx, y: z.cy + o.dy, r: o.r, bg: z.bg, border: z.border, color: z.color };
    });
  });
  const act = matrix.find((m) => m.key === "ACT");
  return (
    <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 26, alignItems: "center" }}>
      <div style={{ display: "grid", gridTemplateColumns: "20px 1fr", gridTemplateRows: "1fr 20px", gap: 6 }}>
        <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text-faint)", gridRow: 1 }}>Impacto ↑</div>
        <div style={{ position: "relative", gridColumn: 2, gridRow: 1, height: 430, borderLeft: "1px solid var(--border-strong)", borderBottom: "1px solid var(--border-strong)", borderRadius: "0 8px 0 0", background: "linear-gradient(0deg,transparent 49.7%,var(--border) 49.7%,var(--border) 50.3%,transparent 50.3%), linear-gradient(90deg,transparent 49.7%,var(--border) 49.7%,var(--border) 50.3%,transparent 50.3%)" }}>
          <ZoneLabel pos={{ top: 0, right: 0, justifyContent: "flex-end" }} color="var(--accent)" bg="color-mix(in srgb, var(--accent) 6%, transparent)">Actuar ya</ZoneLabel>
          <ZoneLabel pos={{ top: 0, left: 0 }} color="var(--info)">Reaccionar</ZoneLabel>
          <ZoneLabel pos={{ bottom: 0, left: 0, alignItems: "flex-end" }} color="var(--text-faint)">Observar</ZoneLabel>
          <ZoneLabel pos={{ bottom: 0, right: 0, alignItems: "flex-end", justifyContent: "flex-end" }} color="var(--warn)">Proteger</ZoneLabel>
          {bubbles.map((b, i) => {
            return (
              <motion.div
                key={b.label}
                title={b.label}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.12 + i * 0.07, ease: [0.34, 1.56, 0.64, 1] }}
                style={{ position: "absolute", left: `${b.x}%`, bottom: `${b.y}%`, width: b.r * 2, height: b.r * 2, marginLeft: -b.r, marginBottom: -b.r, borderRadius: "50%", background: b.bg, border: `1.5px solid ${b.border}`, color: b.color, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: 10.5, lineHeight: 1.15, padding: 8, transformOrigin: "center" }}
              >
                <span style={{ maxWidth: b.r * 1.55, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical" }}>{b.label}</span>
              </motion.div>
            );
          })}
        </div>
        <div style={{ gridColumn: 2, gridRow: 2, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text-faint)" }}>Control propio →</div>
      </div>
      <div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
          <LegendRow bg="color-mix(in srgb, var(--accent) 30%, transparent)" border="var(--accent)" b="Act" s="actuar ya" meta="alto impacto/control" />
          <LegendRow bg="color-mix(in srgb, var(--info) 24%, transparent)" border="var(--info)" b="React" s="responder" meta="señales externas" />
          <LegendRow bg="color-mix(in srgb, var(--text) 10%, transparent)" border="var(--text-faint)" b="Wait" s="observar" meta="monitorear" />
          <LegendRow bg="color-mix(in srgb, var(--warn) 24%, transparent)" border="var(--warn)" b="Fall back" s="proteger" meta="defensivo" />
        </div>
        <div style={box}>
          <div className="t-micro" style={{ color: "var(--accent)", marginBottom: 6 }}>✦ Lectura</div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: "19px", color: "var(--text-muted)" }}>
            {act ? <>Las jugadas de <b style={{ color: "var(--text)", fontWeight: 500 }}>“actuar ya”</b> concentran impacto y control propio: {act.items.join(" · ")}. El resto se monitorea o se responde según la competencia.</> : analysis?.body}
          </p>
        </div>
      </div>
    </div>
  );
}

function ZoneLabel({ children, pos, color, bg }: { children: ReactNode; pos: CSSProperties; color: string; bg?: string }) {
  return (
    <div style={{ position: "absolute", width: "50%", height: "50%", display: "flex", padding: "10px 12px", fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color, background: bg, ...pos }}>{children}</div>
  );
}

function LegendRow({ bg, border, b, s, meta }: { bg: string; border: string; b: string; s: string; meta: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--text)" }}>
      <i style={{ width: 14, height: 14, borderRadius: "50%", flexShrink: 0, background: bg, border: `1.5px solid ${border}` }} />
      <b style={{ fontWeight: 500 }}>{b}</b> · {s}
      <span style={{ color: "var(--text-muted)", fontSize: 12, marginLeft: "auto", fontFamily: "var(--font-mono)" }}>{meta}</span>
    </div>
  );
}

// ============================================================ C · Radar
function RadarView({ radar, swot, analysis }: { radar: RadarVM; swot: Quad[]; analysis: AnalysisVM | null }) {
  const byKey = (k: string) => swot.find((q) => q.key === k);
  const [cli, led] = [radar.series[0]?.vals ?? [], radar.series[1]?.vals ?? []];
  const diff = radar.axes.map((ax, i) => ({ ax, d: (cli[i] ?? 0) - (led[i] ?? 0), sum: (cli[i] ?? 0) + (led[i] ?? 0) }));
  const cliTop = [...diff].sort((a, b) => b.d - a.d);
  const cliBot = [...diff].sort((a, b) => a.d - b.d);
  const lowBoth = [...diff].sort((a, b) => a.sum - b.sum);
  const names = (arr: { ax: string }[], n: number) => arr.slice(0, n).map((x) => x.ax).join(" · ");
  const [head, em] = analysis ? emSplit(analysis.headline) : ["El polígono de Copa ", "se estira en afinidad."];

  const reads = [
    { tone: "var(--success)", letter: "F", title: "Fortalezas", p: byKey("S")?.items[0] ?? "", ax: `▲ ejes ${names(cliTop.filter((x) => x.d > 0), 2)}` },
    { tone: "var(--danger)", letter: "D", title: "Debilidades", p: byKey("W")?.items[0] ?? "", ax: `▼ ejes ${names(cliBot, 2)}` },
    { tone: "var(--info)", letter: "O", title: "Oportunidades", p: byKey("O")?.items[0] ?? "", ax: `○ eje ${lowBoth[0]?.ax ?? ""}` },
    { tone: "var(--warn)", letter: "A", title: "Amenazas", p: byKey("T")?.items[0] ?? "", ax: `▲ líder en ${names(cliBot, 2)}` },
  ];

  return (
    <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 34, alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <RadarChart axes={radar.axes} series={radar.series} size={330} r={108} />
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center" }}>
          {radar.series.map((s) => (
            <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--text)" }}>
              <i style={{ width: 12, height: 3, borderRadius: 2, background: s.color }} /> {s.name}
            </div>
          ))}
        </div>
      </div>
      <div>
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 17, fontWeight: 500, lineHeight: 1.32, color: "var(--text)", margin: "0 0 16px", maxWidth: "52ch" }}>
          {head}<em style={{ fontStyle: "italic", color: "var(--viz-accent)" }}>{em}</em>
        </p>
        <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {reads.map((r) => (
            <div key={r.letter} style={{ border: "1px solid var(--border)", borderTop: `3px solid ${r.tone}`, borderRadius: "var(--r-md)", padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ width: 24, height: 24, borderRadius: 7, background: r.tone, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700 }}>{r.letter}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{r.title}</span>
              </div>
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: "18px", color: "var(--text-muted)" }}>{r.p}</p>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: r.tone, marginTop: 8 }}>{r.ax}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================ D · Roadmap (gantt)
type Lane = "organic" | "paid" | "rep" | "measure";
const LANES: { id: Lane; label: string; color: string }[] = [
  { id: "organic", label: "Orgánico", color: "var(--success)" },
  { id: "paid", label: "Paid", color: "var(--accent)" },
  { id: "rep", label: "Reputación", color: "var(--info)" },
  { id: "measure", label: "Medición", color: "var(--viz-accent)" },
];
function laneOf(t: string): Lane {
  const s = t.toLowerCase();
  if (/pago|paga|pauta|creativo|invers|\bmeta\b|ads/.test(s)) return "paid";
  if (/reddit|hilo|responder|promos|contraprogram|reputaci|coment|soporte|queja/.test(s)) return "rep";
  if (/tablero|cadencia|\bsov\b|medir|métric|metric|test|retenci|kpi/.test(s)) return "measure";
  return "organic";
}

function RoadmapView({ plan }: { plan: Horizon[] }) {
  // tasks[lane][col] = string[]
  const tasks: Record<Lane, string[][]> = { organic: [[], [], []], paid: [[], [], []], rep: [[], [], []], measure: [[], [], []] };
  plan.slice(0, 3).forEach((h, col) => h.items.forEach((it) => tasks[laneOf(it)][col].push(it)));

  return (
    <div className="bb-scroll-x">
    <div style={{ minWidth: 640, border: "1px solid var(--border)", borderRadius: "var(--r-md)", overflow: "hidden", boxShadow: "var(--sh-1)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "160px repeat(3, 1fr)", background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
        <div style={headCell(true)}>Carril</div>
        {plan.slice(0, 3).map((h) => (
          <div key={h.title} style={headCell(false)}>
            <b style={{ color: "var(--text)", display: "block", fontSize: 13, letterSpacing: 0, textTransform: "none", fontFamily: "var(--font-sans)" }}>{h.title}</b>
            {h.window}
          </div>
        ))}
      </div>
      {LANES.map((lane) => (
        <div key={lane.id} style={{ display: "grid", gridTemplateColumns: "160px 1fr", borderTop: "1px solid var(--border)" }}>
          <div style={{ padding: "16px 14px", display: "flex", alignItems: "center", gap: 9, fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
            <i style={{ width: 9, height: 9, borderRadius: 3, flexShrink: 0, background: lane.color }} /> {lane.label}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", padding: "8px 0" }}>
            {[0, 1, 2].map((col) => (
              <div key={col} style={{ padding: "0 0", borderLeft: col > 0 ? "1px solid var(--border)" : "none", display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
                {tasks[lane.id][col].map((t, i) => (
                  <motion.div
                    key={t}
                    initial={{ scaleX: 0.2, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.05 * (col * 2 + i), ease: [0.7, 0.02, 0.2, 1] }}
                    style={{ transformOrigin: "left", margin: "0 10px", minHeight: 30, borderRadius: 7, display: "flex", alignItems: "center", padding: "5px 12px", fontSize: 12, color: "var(--text)", background: `color-mix(in srgb, ${lane.color} 18%, transparent)`, border: `1px solid color-mix(in srgb, ${lane.color} 55%, transparent)` }}
                  >
                    {t}
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
    </div>
  );
}

function headCell(first: boolean): CSSProperties {
  return { padding: "12px 14px", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: first ? "var(--text-faint)" : "var(--text-muted)", borderLeft: first ? "none" : "1px solid var(--border)" };
}
