"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { ArrowLeft, Printer, Presentation } from "lucide-react";
import type { ResolvedCase } from "@/lib/demo-cases";
import type { ReportDoc, Block } from "@/lib/report-doc";
import { ComparisonCards } from "@/components/comparison-cards";

// The delivered report (/reporte) — a polished, client-facing document. Standalone
// (no app shell), case-aware (data comes from the run you opened) and responsive:
// the "sheet" keeps a printed-page feel on desktop and reflows cleanly on mobile
// (fluid width + clamp() type/padding, columns that stack). `.bb-print` is the
// only thing that prints (see globals @media print); `.bb-noprint` is the toolbar.

const SENT: Record<string, { label: string; c: string }> = {
  pos: { label: "Positivo", c: "#1a8f4c" },
  mix: { label: "Mixto", c: "#b67309" },
  neu: { label: "Neutro", c: "#8c8696" },
  neg: { label: "Negativo", c: "#c0392b" },
};
const KEY_ROWS = new Set(["Menciones · 60d", "Engagement total", "Reach estimado", "Share of voice", "Sentimiento dominante"]);
const sovNum = (s: string) => Number(String(s).replace(",", ".")) || 0;

export function ReportPDF({ data }: { data: ResolvedCase }) {
  const c = data;
  const client = c.competitors.find((x) => x.isClient) ?? c.competitors[c.competitors.length - 1];
  const clientName = client?.name ?? c.project;
  const ranked = [...c.competitors].sort((a, b) => sovNum(b.sov) - sovNum(a.sov));
  const maxSov = Math.max(...c.competitors.map((x) => sovNum(x.sov)), 1);
  const cols = c.comparativa.cols;
  const tableRows = c.comparativa.rows.filter((r) => KEY_ROWS.has(r.label));
  const takeaways = c.analysis.takeaways ?? [];
  const recs = c.analysis.recommendations ?? [];
  const finding = takeaways[0] ?? c.analysis.headline;
  const runId = `run #${String(c.runNumber).padStart(3, "0")}`;
  const today = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const [pptxBusy, setPptxBusy] = useState(false);
  async function exportPptxNow() {
    setPptxBusy(true);
    try {
      const exportDoc: ReportDoc = {
        title: `${c.hero.title} ${c.hero.titleEm}`.trim(),
        subtitle: c.hero.subtitle,
        blocks: [
          { id: "exec", type: "h1", text: "Resumen ejecutivo" },
          { id: "head", type: "text", text: c.analysis.headline },
          ...(c.analysis.body ? [{ id: "body", type: "text", text: c.analysis.body } as Block] : []),
          ...c.kpis.slice(0, 2).map((k, i): Block => ({ id: `kpi${i}`, type: "kpi", text: k.label, value: k.value })),
          { id: "chart", type: "chart", text: "Share of voice por competidor" },
          { id: "find", type: "quote", text: finding },
          { id: "cmp", type: "h2", text: "Comparativa" },
          { id: "tbl", type: "table", text: "", rows: [["Métrica", ...cols.map((x) => x.name)], ...tableRows.map((r) => [r.label, ...r.vals.map(String)])] },
          { id: "rech", type: "h2", text: "Recomendaciones" },
          { id: "recl", type: "list", text: "", items: recs },
        ],
      };
      const { exportPptx } = await import("@/lib/export/pptx");
      await exportPptx(exportDoc, `phatia-${c.slug}.pptx`, { clientName });
    } finally {
      setPptxBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100dvh", background: "var(--surface-2)", display: "flex", flexDirection: "column", alignItems: "center", padding: "clamp(10px, 3vw, 28px)" }}>
      {/* toolbar — not part of the printed deliverable */}
      <div className="bb-noprint" style={{ width: "min(900px, 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: "clamp(10px, 2vw, 16px)" }}>
        <Link href={`/overview?case=${encodeURIComponent(c.slug)}`} style={tbtn(false)}><ArrowLeft size={15} /> Volver al run</Link>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={exportPptxNow} disabled={pptxBusy} style={{ ...tbtn(false), opacity: pptxBusy ? 0.6 : 1 }}><Presentation size={15} /> {pptxBusy ? "Generando…" : "Exportar PPTX"}</button>
          <button type="button" onClick={() => window.print()} style={tbtn(true)}><Printer size={15} /> Descargar PDF</button>
        </div>
      </div>

      {/* the sheet */}
      <article className="bb-print" style={{ width: "min(900px, 100%)", background: "#fff", boxShadow: "var(--sh-4)", borderRadius: 6, padding: "clamp(26px, 6vw, 76px)", fontFamily: "var(--font-serif)", color: "var(--n900)", position: "relative" }}>
        {/* running head */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", paddingBottom: 14, borderBottom: "1px solid var(--n200)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--n500)" }}>
            <span style={{ width: 5, height: 18, background: "var(--sa-base)", display: "inline-block", borderRadius: 1 }} /> Phatia · {c.crumb}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--n400)", letterSpacing: ".06em" }}>{runId} · {today}</span>
        </header>

        {/* title block */}
        <div style={{ marginTop: "clamp(22px, 4vw, 36px)" }}>
          <div style={eyebrow}>Informe competitivo · {c.project}</div>
          <h1 style={{ fontSize: "clamp(30px, 7vw, 52px)", lineHeight: 1.05, fontWeight: 500, letterSpacing: "-0.03em", margin: "12px 0 10px", textWrap: "balance" }}>
            {c.hero.title} <em style={{ fontStyle: "italic", color: "var(--n600)" }}>{c.hero.titleEm}</em>
          </h1>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(10px, 2.4vw, 12px)", color: "var(--n500)", letterSpacing: ".03em", lineHeight: 1.5 }}>{c.hero.subtitle}</div>
          <div style={{ marginTop: 12, fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--n400)", textTransform: "uppercase", letterSpacing: ".08em" }}>Preparado para {clientName} · uso interno</div>
        </div>

        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 1, marginTop: "clamp(20px, 4vw, 30px)", background: "var(--n200)", border: "1px solid var(--n200)", borderRadius: 8, overflow: "hidden" }}>
          {c.kpis.map((k) => (
            <div key={k.label} style={{ background: "#fff", padding: "13px 15px" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--n500)" }}>{k.label}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(20px, 4.5vw, 26px)", fontWeight: 500, marginTop: 6, letterSpacing: "-0.01em", color: k.tone === "ink" ? "var(--sa-base)" : "var(--n900)" }}>{k.value}</div>
              {k.delta && <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, marginTop: 3, color: k.up ? "#1a8f4c" : "var(--n500)" }}>{k.up ? "▲ " : ""}{k.delta}</div>}
            </div>
          ))}
        </div>

        {/* 01 · Resumen ejecutivo */}
        <section style={section}>
          <SectionLabel n="01" title="Resumen ejecutivo" />
          <p style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(19px, 3.6vw, 25px)", lineHeight: 1.28, fontWeight: 500, letterSpacing: "-0.015em", margin: "4px 0 14px", textWrap: "balance", color: "var(--n900)" }}>{c.analysis.headline}</p>
          {c.analysis.body && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 270px), 1fr))", gap: "clamp(12px, 3vw, 26px)" }}>
              {splitTwo(c.analysis.body).map((para, i) => (
                <p key={i} style={{ fontSize: "clamp(13px, 2.7vw, 14.5px)", lineHeight: 1.6, margin: 0, textWrap: "pretty", color: "var(--n700)" }}>{para}</p>
              ))}
            </div>
          )}
          {takeaways.length > 0 && (
            <ul style={{ listStyle: "none", margin: "16px 0 0", padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "8px 22px" }}>
              {takeaways.map((tk) => (
                <li key={tk} style={{ display: "flex", gap: 9, fontSize: "clamp(12.5px, 2.6vw, 13.5px)", lineHeight: 1.45, color: "var(--n800)", fontFamily: "var(--font-sans)" }}>
                  <span style={{ color: "var(--sa-base)", flexShrink: 0, fontWeight: 700 }}>→</span> {tk}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 02 · Share of voice — case-aware horizontal bars */}
        <section style={section}>
          <SectionLabel n="02" title="Volumen y share of voice" meta={`fuente · ${runId}`} />
          <div style={{ display: "flex", flexDirection: "column", gap: "clamp(9px, 2vw, 13px)", marginTop: 6 }}>
            {ranked.map((b) => (
              <div key={b.handle} style={{ display: "grid", gridTemplateColumns: "minmax(74px, 150px) 1fr auto", alignItems: "center", gap: "clamp(8px, 2vw, 14px)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, fontFamily: "var(--font-sans)", fontSize: "clamp(12px, 2.6vw, 13.5px)", fontWeight: b.isClient ? 600 : 400, color: b.isClient ? "var(--sa-base)" : "var(--n900)" }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: b.accent, flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</span>
                </span>
                <span style={{ height: 12, borderRadius: 3, background: "var(--n100, #f0ece6)", overflow: "hidden" }}>
                  <span style={{ display: "block", height: "100%", width: `${Math.max(3, (sovNum(b.sov) / maxSov) * 100)}%`, background: b.accent, borderRadius: 3 }} />
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(12px, 2.6vw, 13.5px)", color: "var(--n900)", textAlign: "right", minWidth: 44 }}>{b.sov}%</span>
              </div>
            ))}
          </div>
        </section>

        {/* Hallazgo */}
        <section style={section}>
          <div style={{ borderLeft: "3px solid var(--sa-base)", paddingLeft: "clamp(14px, 3vw, 20px)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--sa-base)", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600 }}>Hallazgo clave</div>
            <div style={{ fontSize: "clamp(18px, 4vw, 24px)", lineHeight: 1.3, fontWeight: 500, marginTop: 7, letterSpacing: "-0.015em", textWrap: "balance" }}>{finding}</div>
          </div>
        </section>

        {/* 03 · Comparativa */}
        <section style={section}>
          <SectionLabel n="03" title="Tabla comparativa" />
          {/* Mobile screen → stacked cards; desktop screen + print → the table. */}
          <div className="bb-rep-cards" style={{ marginTop: 4 }}>
            <ComparisonCards cols={cols} rows={tableRows} tone="paper" />
          </div>
          <div className="bb-scroll-x bb-rep-table" style={{ overflowX: "auto", marginTop: 4 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: Math.max(420, 150 + cols.length * 88), fontFamily: "var(--font-sans)" }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "left", width: 150 }}>Métrica</th>
                  {cols.map((col) => (
                    <th key={col.name} style={{ ...th, textAlign: "right", color: col.isClient ? "var(--sa-base)" : "var(--n600)" }}>{col.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r) => (
                  <tr key={r.label}>
                    <td style={{ ...tdc, color: "var(--n500)", fontFamily: "var(--font-mono)", fontSize: 11 }}>{r.label}</td>
                    {r.vals.map((v, j) => {
                      const isClient = cols[j]?.isClient ?? false;
                      const sent = r.fmt === "sent" ? SENT[String(v)] : null;
                      return (
                        <td key={j} style={{ ...tdc, textAlign: "right", fontFamily: sent ? "var(--font-sans)" : "var(--font-mono)", color: isClient ? "var(--sa-base)" : "var(--n900)", fontWeight: isClient ? 600 : 400 }}>
                          {sent ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, justifyContent: "flex-end" }}>
                              <span style={{ width: 7, height: 7, borderRadius: "50%", background: sent.c }} /> {sent.label}
                            </span>
                          ) : String(v)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 04 · Recomendaciones */}
        {recs.length > 0 && (
          <section style={section}>
            <SectionLabel n="04" title="Recomendaciones" />
            <ol style={{ listStyle: "none", margin: "4px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {recs.map((r, i) => (
                <li key={r} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: "50%", border: "1.5px solid var(--sa-base)", color: "var(--sa-base)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>{i + 1}</span>
                  <span style={{ fontSize: "clamp(13px, 2.8vw, 15px)", lineHeight: 1.5, color: "var(--n800)", fontFamily: "var(--font-sans)", paddingTop: 2 }}>{r}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* footer */}
        <footer style={{ marginTop: "clamp(28px, 5vw, 44px)", paddingTop: 14, borderTop: "1px solid var(--n200)", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--n400)", letterSpacing: ".06em", textTransform: "uppercase" }}>
          <span>Preparado para {clientName} · uso interno</span>
          <span>Generado con Phatia</span>
        </footer>
      </article>
    </div>
  );
}

// Split a body string into ~2 balanced paragraphs at a sentence boundary near the
// middle, so the exec summary reads as a clean two-column block (one col on mobile).
function splitTwo(body: string): string[] {
  const sentences = body.match(/[^.]+\.(?:\s|$)/g);
  if (!sentences || sentences.length < 2) return [body];
  const mid = Math.ceil(sentences.length / 2);
  return [sentences.slice(0, mid).join("").trim(), sentences.slice(mid).join("").trim()].filter(Boolean);
}

function SectionLabel({ n, title, meta }: { n: string; title: string; meta?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
      <div style={{ display: "inline-flex", alignItems: "baseline", gap: 9, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--sa-base)", fontWeight: 600 }}>
        <span>{n}</span><span style={{ color: "var(--n700)" }}>· {title}</span>
      </div>
      {meta && <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--n400)" }}>{meta}</span>}
    </div>
  );
}

const eyebrow: CSSProperties = { fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--sa-base)", letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 600 };
const section: CSSProperties = { marginTop: "clamp(30px, 5vw, 46px)" };
const th: CSSProperties = { padding: "0 10px 9px", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".06em", textTransform: "uppercase", fontWeight: 500, color: "var(--n500)", borderBottom: "1.5px solid var(--n900)", whiteSpace: "nowrap" };
const tdc: CSSProperties = { padding: "10px", fontSize: 13, borderBottom: "1px solid var(--n200)", whiteSpace: "nowrap" };

function tbtn(primary: boolean): CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 8, height: 38, padding: "0 16px", borderRadius: 999,
    fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none",
    border: primary ? "none" : "1px solid var(--border-strong)",
    background: primary ? "var(--accent)" : "var(--surface)",
    color: primary ? "var(--accent-ink)" : "var(--text)",
  };
}
