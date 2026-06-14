"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "motion/react";
import { DEMO_COMPETITORS, DEMO_INSIGHTS } from "@/lib/demo";
import { useI18n } from "@/components/i18n-provider";

type Item = { label: string; hint: string; href?: string; action?: () => void };

const NAV: { labelKey: string; hintKey: string; href: string }[] = [
  { labelKey: "shell.nav.overview", hintKey: "cmd.hOverview", href: "/overview" },
  { labelKey: "shell.nav.livefeed", hintKey: "cmd.hLive", href: "/live-feed" },
  { labelKey: "shell.nav.comparativa", hintKey: "cmd.hComp", href: "/comparativa" },
  { labelKey: "shell.nav.gallery", hintKey: "cmd.hGallery", href: "/galeria" },
  { labelKey: "shell.nav.swot", hintKey: "cmd.hSwot", href: "/swot" },
  { labelKey: "shell.nav.editor", hintKey: "cmd.hEditor", href: "/editor" },
  { labelKey: "cmd.lReport", hintKey: "cmd.hReport", href: "/reporte" },
  { labelKey: "cmd.lRuns", hintKey: "cmd.hRuns", href: "/runs" },
  { labelKey: "shell.nav.projects", hintKey: "cmd.hProjects", href: "/proyectos" },
  { labelKey: "shell.nav.settings", hintKey: "cmd.hSettings", href: "/settings" },
];

// Run-scoped search index: the run's own entities (competitors, insights) and
// key topics — so the header search finds content *inside* the current run.
const RUN_ITEMS: Item[] = [
  ...DEMO_COMPETITORS.map((c) => ({ label: c.name, hint: `Competidor · ${c.sov}% SOV · ${c.mentions} menc.`, href: "/comparativa" })),
  ...DEMO_INSIGHTS.map((i) => ({ label: i.title, hint: "Insight del run", href: "/overview" })),
  { label: "Anuncios pagos", hint: "Galería · ads", href: "/galeria" },
  { label: "Sentimiento", hint: "Live feed", href: "/live-feed" },
  { label: "TikTok / video", hint: "Galería · orgánico", href: "/galeria" },
];

export function CommandPalette() {
  const router = useRouter();
  const { t } = useI18n();
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
    const nav: Item[] = NAV.map((n) => ({ label: t(n.labelKey), hint: t(n.hintKey), href: n.href }));
    const themeItem: Item = {
      label: resolvedTheme === "dark" ? t("cmd.toLight") : t("cmd.toDark"),
      hint: t("cmd.theme"),
      action: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
    };
    return [...RUN_ITEMS, ...nav, themeItem];
  }, [resolvedTheme, setTheme, t]);

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
                placeholder={t("cmd.placeholder")}
                style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: "var(--text)", fontFamily: "var(--font-sans)" }}
              />
              <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-faint)", border: "1px solid var(--border)", borderRadius: 3, padding: "1px 5px" }}>ESC</span>
            </div>
            <div style={{ maxHeight: 320, overflow: "auto", padding: 6 }}>
              {results.length === 0 && (
                <div style={{ padding: "18px 12px", fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>{t("cmd.empty")}</div>
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
