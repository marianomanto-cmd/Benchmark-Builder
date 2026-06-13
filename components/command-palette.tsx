"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "motion/react";

type Item = { label: string; hint: string; href?: string; action?: () => void };

const NAV: Item[] = [
  { label: "Overview", hint: "Resumen del proyecto", href: "/" },
  { label: "Live feed", hint: "Stream de menciones", href: "/live-feed" },
  { label: "Comparativa", hint: "Matriz competidor × métrica", href: "/comparativa" },
  { label: "Galería", hint: "Orgánico vs ads", href: "/galeria" },
  { label: "Plan de research", hint: "Aprobar y ejecutar un run", href: "/research-plan" },
  { label: "Editor de reporte", hint: "Componer el deliverable", href: "/editor" },
  { label: "Reporte PDF", hint: "Deliverable final", href: "/reporte" },
  { label: "Settings", hint: "Fuentes y actores de scraping", href: "/settings" },
];

export function CommandPalette() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("bb:command", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("bb:command", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const themeItem: Item = {
      label: resolvedTheme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro",
      hint: "Tema",
      action: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
    };
    return [...NAV, themeItem];
  }, [resolvedTheme, setTheme]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((it) => `${it.label} ${it.hint}`.toLowerCase().includes(needle));
  }, [q, items]);

  function run(item?: Item) {
    if (!item) return;
    setOpen(false);
    if (item.action) item.action();
    else if (item.href) router.push(item.href);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(24,20,16,.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "12vh" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.2, 0.7, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{ width: 560, maxWidth: "90vw", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-4)", overflow: "hidden" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => { setQ(e.target.value); setIdx(0); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
                  else if (e.key === "Enter") { e.preventDefault(); run(results[idx]); }
                }}
                placeholder="Buscar pantalla o acción…"
                style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: "var(--text)", fontFamily: "var(--font-sans)" }}
              />
              <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-faint)", border: "1px solid var(--border)", borderRadius: 3, padding: "1px 5px" }}>ESC</span>
            </div>
            <div style={{ maxHeight: 320, overflow: "auto", padding: 6 }}>
              {results.length === 0 && (
                <div style={{ padding: "18px 12px", fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>Sin resultados</div>
              )}
              {results.map((it, i) => (
                <button
                  key={it.label}
                  type="button"
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => run(it)}
                  style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: "var(--r-sm)", border: "none", cursor: "pointer", background: i === idx ? "var(--surface-2)" : "transparent", borderLeft: i === idx ? "2px solid var(--accent)" : "2px solid transparent" }}
                >
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{it.label}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto", fontFamily: "var(--font-mono)" }}>{it.hint}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
