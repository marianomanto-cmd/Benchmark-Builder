"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles, X, ArrowUp, Bot, Home } from "lucide-react";

type Msg = { role: "user" | "bot"; text: string; outOfScope?: boolean };

// Mock answer engine over the *current run's* results. In live mode this calls
// Claude with the run's data as context (cost-guarded); here it returns canned,
// on-topic answers and refuses questions outside the run's scope.
function answer(q: string): { text: string; outOfScope: boolean } {
  const t = q.toLowerCase();
  const inScope = /(avianca|latam|wingo|arajet|copa|sentimiento|menci|engagement|\bsov\b|share|anuncio|pauta|spend|invers|tiktok|instagram|youtube|reddit|cartagena|org[aá]nico|pag[ao]|competidor|tendencia|insight|recomend|foda|swot)/.test(t);
  if (!inScope) {
    return {
      outOfScope: true,
      text: "Esa consulta parece salir del alcance de este run (sus competidores, fechas y fuentes). Para investigar algo nuevo, volvé al inicio y armá una nueva investigación.",
    };
  }
  if (/spend|pauta|invers|anuncio|paga|ads?/.test(t))
    return { outOfScope: false, text: "En paid, Avianca lidera el inventario de Meta Ad Library y duplicó su inversión; Copa tiene baja presencia paga. Recomendación: 1–2 creativos de video por semana para la ruta, sin diluir el tono orgánico." };
  if (/tiktok/.test(t))
    return { outOfScope: false, text: "TikTok es el formato de mayor alcance orgánico del corpus y LATAM está ausente ahí: es el espacio más claro para que Copa gane share con POV/vlog." };
  if (/sentimiento|negativ|reddit/.test(t))
    return { outOfScope: false, text: "El sentimiento general es positivo y orgánico; el foco negativo se concentra en un hilo de Reddit sobre cambios de horario de Wingo. Conviene responderlo con info y compensaciones." };
  if (/\bsov\b|share|volumen|menci/.test(t))
    return { outOfScope: false, text: "Share of voice: Avianca 41,3% · LATAM 24,0% · Wingo 12,9% · Arajet 11,9% · Copa 9,9%. La brecha de Copa es de presencia, no de afinidad: su engagement por pieza es el más alto." };
  return { outOfScope: false, text: "Sobre este run: Avianca domina el volumen y la pauta, pero Copa lidera en eficiencia de engagement con un perfil 78% orgánico. La jugada es ganar SOV (TikTok + paid quirúrgico) protegiendo el sentimiento positivo." };
}

export function RunAssistant() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);

  function send() {
    const text = q.trim();
    if (!text) return;
    const a = answer(text);
    setMsgs((m) => [...m, { role: "user", text }, { role: "bot", text: a.text, outOfScope: a.outOfScope }]);
    setQ("");
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            style={{ position: "fixed", right: "max(16px, env(safe-area-inset-right))", bottom: 84, zIndex: 80, width: "min(380px, calc(100vw - 32px))", maxHeight: "min(70vh, 560px)", display: "flex", flexDirection: "column", background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: 16, boxShadow: "0 24px 60px rgba(0,0,0,0.5)", overflow: "hidden" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ width: 26, height: 26, borderRadius: 8, background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Bot size={15} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Preguntá sobre este run</div>
                <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-faint)" }}>responde sobre los resultados obtenidos</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" style={{ border: "none", background: "transparent", color: "var(--text-muted)", cursor: "pointer", display: "inline-flex" }}><X size={16} /></button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
              {msgs.length === 0 && (
                <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: "19px" }}>
                  Ej: <em>“¿quién invierte más en pauta?”</em>, <em>“¿qué pasa en TikTok?”</em>, <em>“¿cómo está el sentimiento?”</em>
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%", padding: "9px 12px", borderRadius: 12, fontSize: 13, lineHeight: "19px", background: m.role === "user" ? "var(--accent)" : "var(--surface-2)", color: m.role === "user" ? "var(--accent-ink)" : "var(--text)", border: m.role === "bot" ? "1px solid var(--border)" : "none" }}>
                  {m.text}
                  {m.outOfScope && (
                    <div style={{ marginTop: 8 }}>
                      <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}><Home size={13} /> Nueva investigación</Link>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ padding: 12, borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <textarea
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Preguntá algo sobre estos resultados…"
                  rows={1}
                  style={{ flex: 1, resize: "none", maxHeight: 90, padding: "9px 12px", borderRadius: 10, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)", fontSize: 13, fontFamily: "var(--font-sans)", lineHeight: "18px" }}
                />
                <button type="button" onClick={send} aria-label="Enviar" style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 10, border: "none", background: "var(--accent)", color: "var(--accent-ink)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><ArrowUp size={16} /></button>
              </div>
              <div style={{ marginTop: 7, fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-faint)" }}>Consume tokens · ~US$0,02 por consulta · acotado a este run</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Asistente del run"
        style={{ position: "fixed", right: "max(16px, env(safe-area-inset-right))", bottom: "max(20px, env(safe-area-inset-bottom))", zIndex: 80, height: 52, borderRadius: 999, padding: "0 18px", display: "inline-flex", alignItems: "center", gap: 9, border: "none", cursor: "pointer", background: "var(--accent)", color: "var(--accent-ink)", boxShadow: "0 12px 30px color-mix(in srgb, var(--accent) 45%, transparent)", fontSize: 13, fontWeight: 600 }}
      >
        {open ? <X size={18} /> : <Sparkles size={18} />}
        <span className="bb-hide-sm">Preguntar a la IA</span>
      </button>
    </>
  );
}
