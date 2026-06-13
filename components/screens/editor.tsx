"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ScreenShell } from "@/components/shell/screen-shell";
import { Ic } from "@/components/ui/icons";
import { Btn, BBBadge } from "@/components/ui/primitives";
import { BBBarChart } from "@/components/ui/charts";

// Functional report editor: a block-based document the user composes, with
// inline editing, an outline, add/move/duplicate/delete, live preview, PDF
// export (print) and autosave to localStorage. Zero backend / zero cost.

type BlockType = "h1" | "h2" | "text" | "quote" | "kpi" | "list" | "chart" | "table";
type Block = { id: string; type: BlockType; text: string; value?: string; items?: string[]; rows?: string[][] };
type Doc = { title: string; subtitle: string; blocks: Block[] };

const uid = () => Math.random().toString(36).slice(2, 9);
const LS_KEY = "phema-report";

const BLOCK_LABELS: Record<BlockType, string> = {
  h1: "Título", h2: "Subtítulo", text: "Párrafo", quote: "Cita", kpi: "KPI", list: "Lista", chart: "Gráfico", table: "Tabla",
};
const INSERTABLE: BlockType[] = ["h1", "h2", "text", "quote", "kpi", "list", "table", "chart"];

const SEED: Doc = {
  title: "Cartagena, en el aire de cuatro aerolíneas",
  subtitle: "Benchmark competitivo · ruta Cartagena · Q2 2026",
  blocks: [
    { id: uid(), type: "h1", text: "Resumen ejecutivo" },
    { id: uid(), type: "text", text: "Entre el 1 de marzo y el 30 de abril, las cinco aerolíneas analizadas produjeron 2.418 piezas relacionadas a Cartagena. Avianca concentra el 41,3% del volumen total; Copa lidera en engagement por pieza con un perfil 78% orgánico." },
    { id: uid(), type: "kpi", text: "Share of voice · Avianca", value: "41,3%" },
    { id: uid(), type: "chart", text: "Volumen mensual por competidor" },
    { id: uid(), type: "quote", text: "El volumen de Avianca casi cuadruplica al de Copa, pero su engagement promedio por pieza es sólo 1,8× más alto." },
    { id: uid(), type: "h2", text: "Recomendaciones" },
    { id: uid(), type: "list", text: "", items: ["Activar TikTok orgánico donde LATAM está ausente.", "Sumar 1–2 creativos pagos por semana en Meta.", "Programar las piezas clave de martes a jueves por la mañana."] },
  ],
};

const tblBtn: CSSProperties = { padding: "3px 9px", border: "1px solid var(--n200)", background: "var(--n50)", color: "var(--n700)", borderRadius: 4, fontSize: 11, cursor: "pointer" };

function Editable({ value, onCommit, placeholder, style }: { value: string; onCommit: (v: string) => void; placeholder?: string; style?: CSSProperties }) {
  return (
    <div
      contentEditable
      suppressContentEditableWarning
      data-ph={placeholder}
      onBlur={(e) => onCommit(e.currentTarget.textContent ?? "")}
      style={{ outline: "none", cursor: "text", minHeight: "1em", ...style }}
    >
      {value}
    </div>
  );
}

export function Editor() {
  const [doc, setDoc] = useState<Doc>(SEED);
  const [sel, setSel] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setDoc(JSON.parse(raw) as Doc);
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(doc));
    } catch {
      /* ignore */
    }
  }, [doc, loaded]);

  const update = (id: string, patch: Partial<Block>) =>
    setDoc((d) => ({ ...d, blocks: d.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));

  function addBlock(type: BlockType) {
    const nb: Block = {
      id: uid(),
      type,
      text: type === "kpi" ? "Nueva métrica" : type === "chart" ? "Nuevo gráfico" : type === "list" || type === "table" ? "" : `Nuevo ${BLOCK_LABELS[type].toLowerCase()}`,
      value: type === "kpi" ? "00" : undefined,
      items: type === "list" ? ["Primer punto"] : undefined,
      rows: type === "table" ? [["Métrica", "Valor"], ["Ejemplo", "00"]] : undefined,
    };
    setDoc((d) => {
      const i = sel ? d.blocks.findIndex((b) => b.id === sel) : d.blocks.length - 1;
      const blocks = [...d.blocks];
      blocks.splice(i + 1, 0, nb);
      return { ...d, blocks };
    });
    setSel(nb.id);
  }
  function move(id: string, dir: -1 | 1) {
    setDoc((d) => {
      const i = d.blocks.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.blocks.length) return d;
      const blocks = [...d.blocks];
      [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
      return { ...d, blocks };
    });
  }
  const remove = (id: string) => { setDoc((d) => ({ ...d, blocks: d.blocks.filter((b) => b.id !== id) })); setSel(null); };
  function duplicate(id: string) {
    setDoc((d) => {
      const i = d.blocks.findIndex((b) => b.id === id);
      if (i < 0) return d;
      const blocks = [...d.blocks];
      blocks.splice(i + 1, 0, { ...d.blocks[i], id: uid() });
      return { ...d, blocks };
    });
  }

  const selected = doc.blocks.find((b) => b.id === sel) ?? null;
  const headings = doc.blocks.filter((b) => b.type === "h1" || b.type === "h2");

  const grid = preview ? "1fr" : "220px 1fr 280px";

  return (
    <ScreenShell breadcrumb={["Proyectos", "Cartagena · Q2 2026", "Editor de reporte"]} badges={<BBBadge tone="info" size="sm">borrador</BBBadge>} runMeta={loaded ? "autoguardado" : "cargando…"}>
      <div className="bb-editor" style={{ display: "grid", gridTemplateColumns: grid, gap: 14, height: "100%" }}>
        {/* outline */}
        {!preview && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 14, overflow: "auto" }}>
            <div className="t-micro">ÍNDICE · {headings.length} secciones</div>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 2 }}>
              {headings.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Agregá un título.</div>}
              {headings.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => { setSel(h.id); document.getElementById(`blk-${h.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
                  style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", paddingLeft: h.type === "h2" ? 22 : 10, borderRadius: "var(--r-sm)", background: sel === h.id ? "var(--surface-2)" : "transparent", borderLeft: sel === h.id ? "2px solid var(--accent)" : "2px solid transparent", fontSize: 12, color: sel === h.id ? "var(--text)" : "var(--text-muted)", border: "none", cursor: "pointer", width: "100%" }}
                >
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.text || "—"}</span>
                </button>
              ))}
              <div style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 8 }}>
                <Btn kind="ghost" size="sm" icon={<Ic.plus s={10} />} onClick={() => addBlock("h2")}>Agregar sección</Btn>
              </div>
            </div>
          </div>
        )}

        {/* canvas */}
        <div style={{ background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: 24, overflow: "auto" }}>
          <div className="bb-print" style={{ width: "100%", maxWidth: 760, margin: "0 auto", background: "#fff", boxShadow: "var(--sh-3)", minHeight: "100%", padding: "clamp(28px, 6vw, 64px)", position: "relative", color: "var(--n900)" }}>
            <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--n400)", letterSpacing: ".1em", textTransform: "uppercase" }}>Phema · reporte</div>
            <Editable value={doc.title} onCommit={(v) => setDoc((d) => ({ ...d, title: v }))} placeholder="Título del reporte" style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(28px, 5vw, 44px)", lineHeight: 1.05, fontWeight: 500, letterSpacing: "-0.02em", margin: "8px 0 6px", color: "var(--n900)" }} />
            <Editable value={doc.subtitle} onCommit={(v) => setDoc((d) => ({ ...d, subtitle: v }))} placeholder="Subtítulo" style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--n500)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 24 }} />

            {doc.blocks.map((b) => {
              const isSel = !preview && b.id === sel;
              return (
                <div
                  key={b.id}
                  id={`blk-${b.id}`}
                  onClick={() => !preview && setSel(b.id)}
                  style={{ position: "relative", margin: "0 0 16px", padding: preview ? 0 : "6px 8px", borderRadius: 6, border: isSel ? "1px solid var(--sa-base)" : "1px solid transparent", background: isSel ? "rgba(107,26,54,.04)" : "transparent", cursor: preview ? "default" : "pointer" }}
                >
                  {b.type === "h1" && <Editable value={b.text} onCommit={(v) => update(b.id, { text: v })} placeholder="Título de sección" style={{ fontFamily: "var(--font-serif)", fontSize: 28, lineHeight: "32px", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--n900)" }} />}
                  {b.type === "h2" && <Editable value={b.text} onCommit={(v) => update(b.id, { text: v })} placeholder="Subtítulo" style={{ fontFamily: "var(--font-serif)", fontSize: 20, lineHeight: "26px", fontWeight: 500, color: "var(--n800)" }} />}
                  {b.type === "text" && <Editable value={b.text} onCommit={(v) => update(b.id, { text: v })} placeholder="Escribí un párrafo…" style={{ fontFamily: "var(--font-serif)", fontSize: 16, lineHeight: "26px", color: "var(--n800)" }} />}
                  {b.type === "quote" && (
                    <div style={{ borderLeft: "3px solid var(--sa-base)", paddingLeft: 16 }}>
                      <Editable value={b.text} onCommit={(v) => update(b.id, { text: v })} placeholder="Cita destacada…" style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 18, lineHeight: "26px", color: "var(--n900)" }} />
                    </div>
                  )}
                  {b.type === "kpi" && (
                    <div style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "10px 14px", background: "var(--n50)", borderRadius: 8 }}>
                      <Editable value={b.value ?? ""} onCommit={(v) => update(b.id, { value: v })} placeholder="00%" style={{ fontFamily: "var(--font-mono)", fontSize: 30, fontWeight: 600, color: "var(--sa-base)" }} />
                      <Editable value={b.text} onCommit={(v) => update(b.id, { text: v })} placeholder="Etiqueta del KPI" style={{ fontSize: 13, color: "var(--n600)" }} />
                    </div>
                  )}
                  {b.type === "list" && (
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {(b.items ?? []).map((it, i) => (
                        <li key={i} style={{ fontFamily: "var(--font-serif)", fontSize: 16, lineHeight: "26px", color: "var(--n800)", marginBottom: 4 }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                            <Editable value={it} onCommit={(v) => update(b.id, { items: (b.items ?? []).map((x, j) => (j === i ? v : x)) })} placeholder="Ítem…" style={{ flex: 1 }} />
                            {!preview && <button type="button" onClick={(e) => { e.stopPropagation(); update(b.id, { items: (b.items ?? []).filter((_, j) => j !== i) }); }} style={{ border: "none", background: "transparent", color: "var(--n400)", cursor: "pointer", fontSize: 12 }}>✕</button>}
                          </div>
                        </li>
                      ))}
                      {!preview && (
                        <li style={{ listStyle: "none", marginLeft: -20 }}>
                          <button type="button" onClick={(e) => { e.stopPropagation(); update(b.id, { items: [...(b.items ?? []), "Nuevo punto"] }); }} style={{ border: "none", background: "transparent", color: "var(--sa-base)", cursor: "pointer", fontSize: 12, fontFamily: "var(--font-sans)" }}>+ ítem</button>
                        </li>
                      )}
                    </ul>
                  )}
                  {b.type === "chart" && (
                    <div>
                      <Editable value={b.text} onCommit={(v) => update(b.id, { text: v })} placeholder="Título del gráfico" style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--n600)", marginBottom: 6 }} />
                      <BBBarChart />
                    </div>
                  )}
                  {b.type === "table" && (
                    <div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-sans)", fontSize: 14 }}>
                        <tbody>
                          {(b.rows ?? []).map((row, ri) => (
                            <tr key={ri}>
                              {row.map((cell, ci) => (
                                <td key={ci} style={{ border: "1px solid var(--n300)", padding: "6px 10px", color: ri === 0 ? "var(--n900)" : "var(--n800)", fontWeight: ri === 0 ? 600 : 400, background: ri === 0 ? "var(--n50)" : "transparent", verticalAlign: "top" }}>
                                  <Editable value={cell} onCommit={(v) => update(b.id, { rows: (b.rows ?? []).map((r, i) => (i === ri ? r.map((c, j) => (j === ci ? v : c)) : r)) })} placeholder="—" />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!preview && (
                        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                          <button type="button" onClick={(e) => { e.stopPropagation(); update(b.id, { rows: [...(b.rows ?? []), Array((b.rows?.[0]?.length) || 2).fill("")] }); }} style={tblBtn}>+ fila</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); update(b.id, { rows: (b.rows ?? []).map((r) => [...r, ""]) }); }} style={tblBtn}>+ columna</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); update(b.id, { rows: (b.rows ?? []).length > 1 ? (b.rows ?? []).slice(0, -1) : (b.rows ?? []) }); }} style={tblBtn}>− fila</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); update(b.id, { rows: (b.rows ?? []).map((r) => (r.length > 1 ? r.slice(0, -1) : r)) }); }} style={tblBtn}>− columna</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* properties / blocks */}
        {!preview && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 14, display: "flex", flexDirection: "column", gap: 14, overflow: "auto" }}>
            <div>
              <div className="t-micro">BLOQUE SELECCIONADO</div>
              {selected ? (
                <div style={{ marginTop: 8 }}>
                  <div style={{ padding: "10px 12px", border: "1px solid var(--accent)", borderRadius: "var(--r-sm)", background: "var(--accent-soft)" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>{BLOCK_LABELS[selected.type]}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    <Btn kind="secondary" size="sm" onClick={() => move(selected.id, -1)}>↑ Subir</Btn>
                    <Btn kind="secondary" size="sm" onClick={() => move(selected.id, 1)}>↓ Bajar</Btn>
                    <Btn kind="ghost" size="sm" icon={<Ic.copy s={11} />} onClick={() => duplicate(selected.id)}>Duplicar</Btn>
                    <Btn kind="destructive" size="sm" onClick={() => remove(selected.id)}>Eliminar</Btn>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>Hacé clic en un bloque del reporte para editarlo o moverlo.</div>
              )}
            </div>
            <div>
              <div className="t-micro">INSERTAR BLOQUE</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
                {INSERTABLE.map((t) => (
                  <button key={t} type="button" onClick={() => addBlock(t)} style={{ padding: "8px 6px", border: "1px solid var(--border)", background: "var(--surface)", borderRadius: "var(--r-sm)", fontSize: 11, color: "var(--text)", cursor: "pointer" }}>{BLOCK_LABELS[t]}</button>
                ))}
              </div>
            </div>
            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              <Btn kind="secondary" size="md" icon={<Ic.eye s={12} />} onClick={() => setPreview(true)}>Vista previa</Btn>
              <Btn kind="accent" size="md" icon={<Ic.download s={12} />} onClick={() => window.print()}>Exportar PDF</Btn>
            </div>
          </div>
        )}
      </div>

      {preview && (
        <div className="bb-noprint" style={{ position: "fixed", right: 24, bottom: 24, zIndex: 60, display: "flex", gap: 8 }}>
          <Btn kind="secondary" size="md" onClick={() => setPreview(false)}>Salir de vista previa</Btn>
          <Btn kind="accent" size="md" icon={<Ic.download s={12} />} onClick={() => window.print()}>Exportar PDF</Btn>
        </div>
      )}
    </ScreenShell>
  );
}
