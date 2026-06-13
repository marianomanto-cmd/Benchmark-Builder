"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { Sparkles, ArrowRight, Wand2, Compass } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export type RunSummary = { number: number; mentions: number; cost: number; when: string };

const EXAMPLES = [
  "una nueva ruta a Cartagena",
  "las tarifas que publicita Avianca",
  "el lanzamiento de clase ejecutiva",
  "qué se dice en X sobre los retrasos",
  "el contenido orgánico vs pago de la competencia",
];

const ease = [0.2, 0.7, 0.3, 1] as const;

export function Portal({ runs }: { runs: RunSummary[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [ph, setPh] = useState(0);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setInterval(() => setPh((i) => (i + 1) % EXAMPLES.length), 2800);
    return () => clearInterval(t);
  }, []);

  function go(query: string, mode?: string) {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (mode) params.set("mode", mode);
    const qs = params.toString();
    router.push(`/research-plan${qs ? `?${qs}` : ""}`);
  }

  const fade = (delay: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease },
  });

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: "var(--bg)", color: "var(--text)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* animated sangría glow */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.35, 0.6, 0.35], scale: [1, 1.12, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "absolute", top: "-22%", left: "50%", width: 820, height: 820, transform: "translateX(-50%)", background: "radial-gradient(circle, rgba(107,26,54,0.30), rgba(107,26,54,0) 62%)", filter: "blur(20px)", pointerEvents: "none" }}
      />

      {/* top bar */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--sa-base)" }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Benchmark Builder</span>
        </div>
        <ThemeToggle />
      </div>

      {/* center */}
      <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px 64px", textAlign: "center" }}>
        <motion.div {...fade(0.05)} className="t-micro" style={{ color: "var(--accent)" }}>
          BENCHMARK BUILDER · RESEARCH ASISTIDO
        </motion.div>

        <motion.h1
          {...fade(0.12)}
          style={{ fontFamily: "var(--font-serif)", fontSize: 60, lineHeight: "64px", fontWeight: 500, letterSpacing: "-0.03em", margin: "16px 0 8px", maxWidth: 760, textWrap: "balance" }}
        >
          ¿Qué querés investigar <em style={{ fontStyle: "italic", color: "var(--accent)" }}>hoy</em>?
        </motion.h1>

        <motion.p {...fade(0.18)} className="t-body" style={{ color: "var(--text-muted)", maxWidth: 520, marginBottom: 26 }}>
          Describí tu pregunta de negocio. Armamos el marco, estimamos el costo y la IA produce el análisis.
        </motion.p>

        {/* AI input */}
        <motion.form
          {...fade(0.24)}
          onSubmit={(e) => { e.preventDefault(); go(q); }}
          style={{ width: "100%", maxWidth: 640 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 16px",
              borderRadius: 14,
              background: "var(--surface)",
              border: `1px solid ${focused ? "var(--accent)" : "var(--border)"}`,
              boxShadow: focused ? "0 0 0 4px rgba(107,26,54,.12), var(--sh-3)" : "var(--sh-2)",
              transition: "box-shadow .2s ease, border-color .2s ease",
            }}
          >
            <Sparkles size={18} style={{ color: "var(--accent)", flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={`Ej: ${EXAMPLES[ph]}…`}
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 16, color: "var(--text)", fontFamily: "var(--font-sans)" }}
            />
            <button
              type="submit"
              aria-label="Empezar"
              style={{ width: 38, height: 38, borderRadius: 10, border: "none", cursor: "pointer", background: "var(--sa-base)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            >
              <ArrowRight size={18} />
            </button>
          </div>

          {/* quick example chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 16 }}>
            {EXAMPLES.slice(0, 3).map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => { setQ(ex); inputRef.current?.focus(); }}
                style={{ fontSize: 12, padding: "6px 12px", borderRadius: 99, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-muted)", cursor: "pointer" }}
              >
                {ex}
              </button>
            ))}
          </div>
        </motion.form>

        {/* secondary actions */}
        <motion.div {...fade(0.32)} style={{ display: "flex", gap: 12, marginTop: 28 }}>
          <button onClick={() => go("", "guided")} type="button" style={ctaStyle()}>
            <Wand2 size={15} style={{ color: "var(--accent)" }} /> Nuevo análisis guiado
          </button>
          <button onClick={() => go("", "general")} type="button" style={ctaStyle()}>
            <Compass size={15} style={{ color: "var(--accent)" }} /> Análisis general
          </button>
        </motion.div>

        {/* recent runs */}
        {runs.length > 0 && (
          <motion.div {...fade(0.4)} style={{ width: "100%", maxWidth: 720, marginTop: 48 }}>
            <div className="t-micro" style={{ textAlign: "left", marginBottom: 10 }}>RUNS RECIENTES</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {runs.slice(0, 3).map((r) => (
                <Link
                  key={r.number}
                  href="/overview"
                  style={{ textAlign: "left", textDecoration: "none", color: "inherit", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 14, boxShadow: "var(--sh-1)" }}
                >
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>run #{String(r.number).padStart(3, "0")}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>Cartagena · Q2 2026</div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    <span>{r.when}</span>
                    <span>USD {r.cost.toFixed(2)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function ctaStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    borderRadius: "var(--r-sm)",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--text)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  };
}
