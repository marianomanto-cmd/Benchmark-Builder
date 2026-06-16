"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Share2, History, RotateCcw, Presentation } from "lucide-react";
import { ScreenShell } from "@/components/shell/screen-shell";
import { Ic } from "@/components/ui/icons";
import { Btn, BBBadge } from "@/components/ui/primitives";
import { BBBarChart } from "@/components/ui/charts";
import { ReportDocView } from "@/components/report-doc-view";
import { useI18n } from "@/components/i18n-provider";
import { SEED_DOC, uid, type Block, type BlockType, type ReportDoc as Doc } from "@/lib/report-doc";

// Functional report editor: a block-based document the user composes, with inline
// editing, an outline, add/move/duplicate/delete, live preview, PDF export (print),
// and persistence to Supabase (debounced autosave + version history + read-only
// share link). localStorage is kept as an offline cache; the seed is the fallback.

const LS_KEY = "phema-report";
const INSERTABLE: BlockType[] = ["h1", "h2", "text", "quote", "kpi", "list", "table", "chart"];
const hhmm = () => new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

type SaveState = { status: "idle" | "saving" | "saved" | "offline"; at?: string };
type Version = { id: string; label: string | null; createdAt: string };

const tblBtn: CSSProperties = { padding: "3px 9px", border: "1px solid var(--n200)", background: "var(--n50)", color: "var(--n700)", borderRadius: 4, fontSize: 11, cursor: "pointer" };

function readLS(): Doc | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Doc) : null;
  } catch {
    return null;
  }
}

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
  const { t } = useI18n();
  const [doc, setDoc] = useState<Doc>(SEED_DOC);
  const [sel, setSel] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const reportIdRef = useRef<string | null>(null);
  const [save, setSave] = useState<SaveState>({ status: "idle" });
  const [versions, setVersions] = useState<Version[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [pptxBusy, setPptxBusy] = useState(false);

  const blockLabel = (type: BlockType) => t(`ed.block.${type}`);

  async function exportPptxNow() {
    setPptxBusy(true);
    try {
      const { exportPptx } = await import("@/lib/export/pptx");
      await exportPptx(doc, "phatia-reporte.pptx");
    } finally {
      setPptxBusy(false);
    }
  }

  // Persist the doc remotely (service-role API route); falls back to the LS cache.
  async function persist(d: Doc, snapshot: boolean, label?: string) {
    setSave({ status: "saving" });
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: snapshot ? "snapshot" : "save", id: reportIdRef.current, title: d.title, subtitle: d.subtitle, doc: d, label }),
      });
      const json = (await res.json()) as { ok: boolean; id?: string | null; versions?: Version[] };
      if (json.ok) {
        if (json.id) reportIdRef.current = json.id;
        if (json.versions) setVersions(json.versions);
        setSave({ status: reportIdRef.current ? "saved" : "offline", at: hhmm() });
      } else {
        setSave({ status: "offline", at: hhmm() });
      }
    } catch {
      setSave({ status: "offline", at: hhmm() });
    }
  }

  // Load: prefer the persisted report; if there's no DB row (id null) keep the
  // offline cache so edits survive in demo; else the seed.
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const res = await fetch("/api/reports");
        const json = (await res.json()) as { ok: boolean; report?: { id: string | null; doc: Doc; isPublic: boolean; shareToken: string | null }; versions?: Version[] };
        if (!off && json.ok && json.report) {
          const r = json.report;
          reportIdRef.current = r.id;
          setIsPublic(r.isPublic);
          const ls = readLS();
          setDoc(r.id ? r.doc : ls ?? r.doc);
          if (json.versions) setVersions(json.versions);
        } else if (!off) {
          setDoc(readLS() ?? SEED_DOC);
        }
      } catch {
        if (!off) setDoc(readLS() ?? SEED_DOC);
      }
      if (!off) setLoaded(true);
    })();
    return () => { off = true; };
  }, []);

  // Offline cache + debounced remote autosave (skips the first run after load).
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipFirst = useRef(true);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(LS_KEY, JSON.stringify(doc)); } catch { /* ignore */ }
    if (skipFirst.current) { skipFirst.current = false; return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void persist(doc, false); }, 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [doc, loaded]);

  async function publish() {
    if (!reportIdRef.current) await persist(doc, false);
    const id = reportIdRef.current;
    if (!id) { setShareMsg(t("ed.shareNeedsCloud")); return; }
    try {
      const res = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "publish", id }) });
      const json = (await res.json()) as { ok: boolean; token?: string };
      if (json.ok && json.token) {
        setIsPublic(true);
        const url = `${window.location.origin}/r/${json.token}`;
        try { await navigator.clipboard.writeText(url); setShareMsg(`${t("ed.shareCopied")} · ${url}`); } catch { setShareMsg(url); }
      } else setShareMsg(t("ed.shareFailed"));
    } catch { setShareMsg(t("ed.shareFailed")); }
  }

  async function restore(versionId: string) {
    const id = reportIdRef.current;
    if (!id) return;
    try {
      const res = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "restore", id, versionId }) });
      const json = (await res.json()) as { ok: boolean; doc?: Doc; versions?: Version[] };
      if (json.ok && json.doc) { skipFirst.current = true; setDoc(json.doc); if (json.versions) setVersions(json.versions); setSave({ status: "saved", at: hhmm() }); }
    } catch { /* ignore */ }
  }

  const update = (id: string, patch: Partial<Block>) =>
    setDoc((d) => ({ ...d, blocks: d.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));

  function addBlock(type: BlockType) {
    const nb: Block = {
      id: uid(),
      type,
      text: type === "kpi" ? t("ed.new.kpi") : type === "chart" ? t("ed.new.chart") : type === "list" || type === "table" ? "" : t("ed.new.generic", { label: blockLabel(type).toLowerCase() }),
      value: type === "kpi" ? "00" : undefined,
      items: type === "list" ? [t("ed.new.listItem")] : undefined,
      rows: type === "table" ? [[t("ed.new.tblMetric"), t("ed.new.tblValue")], [t("ed.new.tblExample"), t("ed.new.tblNum")]] : undefined,
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

  const meta = !loaded ? t("ed.loading")
    : save.status === "saving" ? t("ed.saving")
    : save.status === "saved" ? t("ed.savedAt", { at: save.at ?? "" })
    : save.status === "offline" ? t("ed.savedLocal")
    : t("ed.autosaved");

  return (
    <ScreenShell breadcrumb={["@nav.dashboard", "Cartagena · Q2 2026", "@shell.nav.editor"]} badges={<BBBadge tone="info" size="sm">{t("ed.draft")}</BBBadge>} runMeta={meta}>
      <div className="bb-editor" style={{ display: "grid", gridTemplateColumns: grid, gap: 14, height: "100%" }}>
        {/* outline */}
        {!preview && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 14, overflow: "auto" }}>
            <div className="t-micro">{t("ed.outline", { n: headings.length })}</div>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 2 }}>
              {headings.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("ed.outlineEmpty")}</div>}
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
                <Btn kind="ghost" size="sm" icon={<Ic.plus s={10} />} onClick={() => addBlock("h2")}>{t("ed.addSection")}</Btn>
              </div>
            </div>
          </div>
        )}

        {/* canvas */}
        <div style={{ background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: 24, overflow: "auto" }}>
          <div className="bb-print" style={{ width: "100%", maxWidth: 760, margin: "0 auto", background: "#fff", boxShadow: "var(--sh-3)", minHeight: "100%", padding: "clamp(28px, 6vw, 64px)", position: "relative", color: "var(--n900)" }}>
            {preview ? (
              <ReportDocView doc={doc} />
            ) : (
              <>
                <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--n400)", letterSpacing: ".1em", textTransform: "uppercase" }}>{t("ed.reportTag")}</div>
                <Editable value={doc.title} onCommit={(v) => setDoc((d) => ({ ...d, title: v }))} placeholder={t("ed.ph.title")} style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(28px, 5vw, 44px)", lineHeight: 1.05, fontWeight: 500, letterSpacing: "-0.02em", margin: "8px 0 6px", color: "var(--n900)" }} />
                <Editable value={doc.subtitle} onCommit={(v) => setDoc((d) => ({ ...d, subtitle: v }))} placeholder={t("ed.ph.subtitle")} style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--n500)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 24 }} />

                {doc.blocks.map((b) => {
                  const isSel = b.id === sel;
                  return (
                    <div
                      key={b.id}
                      id={`blk-${b.id}`}
                      onClick={() => setSel(b.id)}
                      style={{ position: "relative", margin: "0 0 16px", padding: "6px 8px", borderRadius: 6, border: isSel ? "1px solid var(--sa-base)" : "1px solid transparent", background: isSel ? "rgba(107,26,54,.04)" : "transparent", cursor: "pointer" }}
                    >
                      {b.type === "h1" && <Editable value={b.text} onCommit={(v) => update(b.id, { text: v })} placeholder={t("ed.ph.h1")} style={{ fontFamily: "var(--font-serif)", fontSize: 28, lineHeight: "32px", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--n900)" }} />}
                      {b.type === "h2" && <Editable value={b.text} onCommit={(v) => update(b.id, { text: v })} placeholder={t("ed.ph.subtitle")} style={{ fontFamily: "var(--font-serif)", fontSize: 20, lineHeight: "26px", fontWeight: 500, color: "var(--n800)" }} />}
                      {b.type === "text" && <Editable value={b.text} onCommit={(v) => update(b.id, { text: v })} placeholder={t("ed.ph.text")} style={{ fontFamily: "var(--font-serif)", fontSize: 16, lineHeight: "26px", color: "var(--n800)" }} />}
                      {b.type === "quote" && (
                        <div style={{ borderLeft: "3px solid var(--sa-base)", paddingLeft: 16 }}>
                          <Editable value={b.text} onCommit={(v) => update(b.id, { text: v })} placeholder={t("ed.ph.quote")} style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 18, lineHeight: "26px", color: "var(--n900)" }} />
                        </div>
                      )}
                      {b.type === "kpi" && (
                        <div style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "10px 14px", background: "var(--n50)", borderRadius: 8 }}>
                          <Editable value={b.value ?? ""} onCommit={(v) => update(b.id, { value: v })} placeholder={t("ed.ph.kpiVal")} style={{ fontFamily: "var(--font-mono)", fontSize: 30, fontWeight: 600, color: "var(--sa-base)" }} />
                          <Editable value={b.text} onCommit={(v) => update(b.id, { text: v })} placeholder={t("ed.ph.kpiLabel")} style={{ fontSize: 13, color: "var(--n600)" }} />
                        </div>
                      )}
                      {b.type === "list" && (
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          {(b.items ?? []).map((it, i) => (
                            <li key={i} style={{ fontFamily: "var(--font-serif)", fontSize: 16, lineHeight: "26px", color: "var(--n800)", marginBottom: 4 }}>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                                <Editable value={it} onCommit={(v) => update(b.id, { items: (b.items ?? []).map((x, j) => (j === i ? v : x)) })} placeholder={t("ed.ph.item")} style={{ flex: 1 }} />
                                <button type="button" onClick={(e) => { e.stopPropagation(); update(b.id, { items: (b.items ?? []).filter((_, j) => j !== i) }); }} style={{ border: "none", background: "transparent", color: "var(--n400)", cursor: "pointer", fontSize: 12 }}>✕</button>
                              </div>
                            </li>
                          ))}
                          <li style={{ listStyle: "none", marginLeft: -20 }}>
                            <button type="button" onClick={(e) => { e.stopPropagation(); update(b.id, { items: [...(b.items ?? []), t("ed.new.point")] }); }} style={{ border: "none", background: "transparent", color: "var(--sa-base)", cursor: "pointer", fontSize: 12, fontFamily: "var(--font-sans)" }}>{t("ed.addItem")}</button>
                          </li>
                        </ul>
                      )}
                      {b.type === "chart" && (
                        <div>
                          <Editable value={b.text} onCommit={(v) => update(b.id, { text: v })} placeholder={t("ed.ph.chart")} style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--n600)", marginBottom: 6 }} />
                          <BBBarChart />
                        </div>
                      )}
                      {b.type === "table" && (
                        <div className="bb-scroll-x" style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-sans)", fontSize: 14, minWidth: 360 }}>
                            <tbody>
                              {(b.rows ?? []).map((row, ri) => (
                                <tr key={ri}>
                                  {row.map((cell, ci) => (
                                    <td key={ci} style={{ border: "1px solid var(--n300)", padding: "6px 10px", color: ri === 0 ? "var(--n900)" : "var(--n800)", fontWeight: ri === 0 ? 600 : 400, background: ri === 0 ? "var(--n50)" : "transparent", verticalAlign: "top" }}>
                                      <Editable value={cell} onCommit={(v) => update(b.id, { rows: (b.rows ?? []).map((r, i) => (i === ri ? r.map((c, j) => (j === ci ? v : c)) : r)) })} placeholder={t("ed.ph.cell")} />
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                            <button type="button" onClick={(e) => { e.stopPropagation(); update(b.id, { rows: [...(b.rows ?? []), Array((b.rows?.[0]?.length) || 2).fill("")] }); }} style={tblBtn}>{t("ed.addRow")}</button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); update(b.id, { rows: (b.rows ?? []).map((r) => [...r, ""]) }); }} style={tblBtn}>{t("ed.addCol")}</button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); update(b.id, { rows: (b.rows ?? []).length > 1 ? (b.rows ?? []).slice(0, -1) : (b.rows ?? []) }); }} style={tblBtn}>{t("ed.delRow")}</button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); update(b.id, { rows: (b.rows ?? []).map((r) => (r.length > 1 ? r.slice(0, -1) : r)) }); }} style={tblBtn}>{t("ed.delCol")}</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* properties / blocks */}
        {!preview && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 14, display: "flex", flexDirection: "column", gap: 14, overflow: "auto" }}>
            <div>
              <div className="t-micro">{t("ed.selectedBlock")}</div>
              {selected ? (
                <div style={{ marginTop: 8 }}>
                  <div style={{ padding: "10px 12px", border: "1px solid var(--accent)", borderRadius: "var(--r-sm)", background: "var(--accent-soft)" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>{blockLabel(selected.type)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    <Btn kind="secondary" size="sm" onClick={() => move(selected.id, -1)}>{t("ed.up")}</Btn>
                    <Btn kind="secondary" size="sm" onClick={() => move(selected.id, 1)}>{t("ed.down")}</Btn>
                    <Btn kind="ghost" size="sm" icon={<Ic.copy s={11} />} onClick={() => duplicate(selected.id)}>{t("ed.duplicate")}</Btn>
                    <Btn kind="destructive" size="sm" onClick={() => remove(selected.id)}>{t("ed.delete")}</Btn>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>{t("ed.selectHint")}</div>
              )}
            </div>
            <div>
              <div className="t-micro">{t("ed.insertBlock")}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
                {INSERTABLE.map((bt) => (
                  <button key={bt} type="button" onClick={() => addBlock(bt)} style={{ padding: "8px 6px", border: "1px solid var(--border)", background: "var(--surface)", borderRadius: "var(--r-sm)", fontSize: 11, color: "var(--text)", cursor: "pointer" }}>{blockLabel(bt)}</button>
                ))}
              </div>
            </div>

            {/* history */}
            <div>
              <button type="button" onClick={() => setShowVersions((v) => !v)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "1px solid var(--border)", background: "var(--surface)", borderRadius: "var(--r-sm)", cursor: "pointer", color: "var(--text)", fontSize: 12 }}>
                <History size={13} /> {t("ed.history")} <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{versions.length}</span>
              </button>
              {showVersions && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5, maxHeight: 180, overflow: "auto" }}>
                  {versions.length === 0 && <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{t("ed.historyEmpty")}</div>}
                  {versions.map((v) => (
                    <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.label || new Date(v.createdAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                      <button type="button" onClick={() => restore(v.id)} aria-label={t("ed.restore")} title={t("ed.restore")} style={{ border: "none", background: "transparent", color: "var(--accent)", cursor: "pointer", display: "inline-flex", padding: 2 }}><RotateCcw size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {shareMsg && <div style={{ fontSize: 11, color: "var(--text-muted)", wordBreak: "break-all", lineHeight: 1.4 }}>{shareMsg}</div>}
              <Btn kind="secondary" size="sm" onClick={() => persist(doc, true, hhmm())}>{t("ed.saveVersion")}</Btn>
              <Btn kind="secondary" size="sm" icon={<Share2 size={12} />} onClick={publish}>{isPublic ? t("ed.copyLink") : t("ed.share")}</Btn>
              <Btn kind="secondary" size="md" icon={<Ic.eye s={12} />} onClick={() => setPreview(true)}>{t("ed.preview")}</Btn>
              <Btn kind="secondary" size="md" loading={pptxBusy} icon={<Presentation size={13} />} onClick={exportPptxNow}>{t("ed.exportPptx")}</Btn>
              <Btn kind="accent" size="md" icon={<Ic.download s={12} />} onClick={() => window.print()}>{t("ed.exportPdf")}</Btn>
            </div>
          </div>
        )}
      </div>

      {preview && (
        <div className="bb-noprint" style={{ position: "fixed", right: 24, bottom: 24, zIndex: 60, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Btn kind="secondary" size="md" onClick={() => setPreview(false)}>{t("ed.exitPreview")}</Btn>
          <Btn kind="secondary" size="md" loading={pptxBusy} icon={<Presentation size={13} />} onClick={exportPptxNow}>{t("ed.exportPptx")}</Btn>
          <Btn kind="accent" size="md" icon={<Ic.download s={12} />} onClick={() => window.print()}>{t("ed.exportPdf")}</Btn>
        </div>
      )}
    </ScreenShell>
  );
}
