"use client";

import type { CSSProperties, ReactNode } from "react";
import { motion } from "motion/react";
import { ScreenShell } from "@/components/shell/screen-shell";
import Link from "next/link";
import { Ic } from "@/components/ui/icons";
import { Btn, BBBadge } from "@/components/ui/primitives";
import { AnalysisBlock } from "@/components/analysis-block";
import type { AnalysisVM } from "@/lib/view-models";

// FODA / SWOT + action matrix + short/mid/long-term recommendations.
// Demo content for the Copa case; a real run fills this from Claude later.

type Quad = { key: string; title: string; tone: string; items: string[] };
const SWOT: Quad[] = [
  { key: "S", title: "Fortalezas", tone: "var(--success)", items: [
    "Mayor engagement orgánico por pieza de la categoría.",
    "Sentimiento positivo sólido y estable (afinidad de marca).",
    "Perfil 78% orgánico: bajo costo de presencia.",
    "Conectividad del hub de Panamá como diferencial.",
  ] },
  { key: "W", title: "Debilidades", tone: "var(--danger)", items: [
    "Share of voice bajo (9,9%) vs. Avianca (41,3%).",
    "Baja presencia en Meta Ad Library.",
    "Menor cadencia de publicación que la competencia.",
    "Casi sin presencia en TikTok orgánico.",
  ] },
  { key: "O", title: "Oportunidades", tone: "var(--info)", items: [
    "TikTok orgánico libre: LATAM está ausente.",
    "Escalar paid sin diluir el tono orgánico que ya funciona.",
    "Capitalizar el sentimiento mixto de LATAM.",
    "Formato POV/vlog con alto alcance comprobado.",
  ] },
  { key: "T", title: "Amenazas", tone: "var(--warn)", items: [
    "Avianca duplicó su inversión en Meta Ads.",
    "Guerra de tarifas en la ruta (Wingo/Arajet por precio).",
    "Hilos negativos en Reddit (cambios de horario).",
    "Riesgo de quedar fuera del set de consideración por bajo SOV.",
  ] },
];

type Move = { key: string; title: string; sub: string; color: string; items: string[] };
const MATRIX: Move[] = [
  { key: "ACT", title: "Act · actuar ya", sub: "alto impacto / control propio", color: "var(--accent)", items: [
    "Lanzar TikTok orgánico (POV/vlog) donde LATAM no está.",
    "Sumar 1–2 creativos pagos/semana en Meta para la ruta.",
  ] },
  { key: "WAIT", title: "Wait · observar", sub: "monitorear antes de mover", color: "var(--text-muted)", items: [
    "Evolución del spend de Avianca semana a semana.",
    "Nuevas rutas/lanzamientos de Arajet.",
  ] },
  { key: "REACT", title: "React · reaccionar", sub: "responder señales en curso", color: "var(--info)", items: [
    "Responder el hilo de Reddit de Wingo con info y compensaciones.",
    "Contraprogramar promos de tarifas de la competencia.",
  ] },
  { key: "FALLBACK", title: "Fall back · replegar", sub: "proteger si escala el riesgo", color: "var(--warn)", items: [
    "Si la guerra de precios escala, competir con experiencia/bundles, no con descuento.",
    "Concentrar pauta en los segmentos de mayor retorno.",
  ] },
];

type Horizon = { title: string; window: string; items: string[] };
const PLAN: Horizon[] = [
  { title: "Corto plazo", window: "0–30 días", items: [
    "Activar TikTok orgánico con 3–4 piezas POV/vlog.",
    "Responder el hilo negativo de Reddit.",
    "2 creativos pagos en Meta para la ruta a Cartagena.",
  ] },
  { title: "Mediano plazo", window: "1–3 meses", items: [
    "Cadencia fija martes–jueves AM (picos de conversación).",
    "Testear formatos de video vs. foto y medir alcance.",
    "Tablero de SOV semanal vs. competencia.",
  ] },
  { title: "Largo plazo", window: "3–12 meses", items: [
    "Construir SOV sostenido sin diluir el sentimiento positivo.",
    "Programa de afinidad / contenido UGC.",
    "Modelo de inversión orgánico+paid atado a retorno por ruta.",
  ] },
];

export function Swot({ analysis }: { analysis?: AnalysisVM | null }) {
  return (
    <ScreenShell breadcrumb={["Proyectos", "Cartagena · Q2 2026", "FODA & Estrategia"]} badges={<BBBadge tone="accent" size="sm">estrategia</BBBadge>} runMeta="generado del run #042">
      <div className="bb-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, marginBottom: 16 }}>
        <div>
          <div className="t-micro" style={{ color: "var(--accent)" }}>FODA · MATRIZ DE ACCIÓN · ROADMAP</div>
          <div className="t-h1" style={{ marginTop: 6, color: "var(--text)" }}>De los datos a la jugada</div>
        </div>
        <Link href="/editor"><Btn kind="secondary" size="sm" icon={<Ic.copy s={11} />}>Insertar en reporte</Btn></Link>
      </div>

      {analysis && <div style={{ marginBottom: 18 }}><AnalysisBlock analysis={analysis} /></div>}

      {/* SWOT 2x2 */}
      <div className="t-h3" style={{ color: "var(--text)", marginBottom: 10 }}>FODA</div>
      <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 22 }}>
        {SWOT.map((q, i) => (
          <motion.div key={q.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, delay: i * 0.05 }} style={{ ...box, borderTop: `3px solid ${q.tone}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 26, height: 26, borderRadius: 8, background: `color-mix(in srgb, ${q.tone} 18%, transparent)`, color: q.tone, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700 }}>{q.key}</span>
              <div className="t-h3" style={{ color: "var(--text)" }}>{q.title}</div>
            </div>
            <ul style={ul}>{q.items.map((it) => <Li key={it} dot={q.tone}>{it}</Li>)}</ul>
          </motion.div>
        ))}
      </div>

      {/* Action matrix */}
      <div className="t-h3" style={{ color: "var(--text)", marginBottom: 10 }}>Matriz de acción</div>
      <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 22 }}>
        {MATRIX.map((m, i) => (
          <motion.div key={m.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, delay: i * 0.05 }} style={box}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, justifyContent: "space-between" }}>
              <div className="t-h3" style={{ color: m.color }}>{m.title}</div>
            </div>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: ".06em", marginTop: 2 }}>{m.sub}</div>
            <ul style={ul}>{m.items.map((it) => <Li key={it} dot={m.color}>{it}</Li>)}</ul>
          </motion.div>
        ))}
      </div>

      {/* Roadmap short/mid/long */}
      <div className="t-h3" style={{ color: "var(--text)", marginBottom: 10 }}>Recomendaciones por horizonte</div>
      <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {PLAN.map((h, i) => (
          <motion.div key={h.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, delay: i * 0.05 }} style={{ ...box, background: i === 0 ? "color-mix(in srgb, var(--accent) 7%, var(--surface))" : "var(--surface)" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
              <div className="t-h3" style={{ color: "var(--text)" }}>{h.title}</div>
              <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--accent)", border: "1px solid var(--accent)", borderRadius: 999, padding: "2px 8px" }}>{h.window}</span>
            </div>
            <ul style={ul}>{h.items.map((it) => <Li key={it} dot="var(--accent)" num>{it}</Li>)}</ul>
          </motion.div>
        ))}
      </div>
    </ScreenShell>
  );
}

const box: CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 18, boxShadow: "var(--sh-1)" };
const ul: CSSProperties = { listStyle: "none", margin: "12px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 9 };

function Li({ children, dot, num }: { children: ReactNode; dot: string; num?: boolean }) {
  return (
    <li style={{ display: "flex", gap: 10, fontSize: 13, lineHeight: "19px", color: "var(--text-muted)" }}>
      <span style={{ flexShrink: 0, marginTop: num ? 0 : 6, width: num ? "auto" : 6, height: num ? "auto" : 6, borderRadius: num ? 0 : "50%", background: num ? "transparent" : dot, color: dot, fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700 }}>{num ? "›" : ""}</span>
      <span>{children}</span>
    </li>
  );
}
