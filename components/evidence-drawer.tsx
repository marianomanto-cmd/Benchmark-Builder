"use client";

import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { MentionCard, PlatformBadge } from "@/components/domain";
import { getCase } from "@/lib/demo-cases";
import { PLATFORMS, type PlatformKey } from "@/lib/platforms";
import type { MentionVM } from "@/lib/view-models";

// "Click al dato": every key number / insight opens the real posts & ads behind
// it — the verifiable differentiator vs a GPT-wrapper. The evidence is the run's
// mentions (seed in demo / DB in live); we never synthesize at runtime.
export type EvidenceQuery = { title: string; match: (m: MentionVM) => boolean } | null;

// Predicate helpers used by the triggers.
export function byCompetitor(name: string): EvidenceQuery {
  const a = name.toLowerCase();
  return { title: `Evidencia · ${name}`, match: (m) => { const b = (m.brand ?? "").toLowerCase(); return !!b && (a.includes(b) || b.includes(a)); } };
}
export function byInsight(title: string): EvidenceQuery {
  const low = title.toLowerCase();
  return {
    title,
    match: (m) => {
      if (m.brand && low.includes(m.brand.toLowerCase())) return true;
      const p = (PLATFORMS[m.platform]?.name ?? m.platform).toLowerCase();
      if (low.includes(p) || low.includes(m.platform.toLowerCase())) return true;
      if ((low.includes("anuncio") || low.includes("pauta") || low.includes("ads") || low.includes("paga") || low.includes("pago")) && m.isAd) return true;
      if ((low.includes("orgánic") || low.includes("organic") || low.includes("tiktok")) && !m.isAd) return true;
      return false;
    },
  };
}

export function EvidenceDrawer({ query, caseSlug, onClose }: { query: EvidenceQuery; caseSlug?: string; onClose: () => void }) {
  const open = Boolean(query);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const items = useMemo<MentionVM[]>(() => {
    if (!query) return [];
    try { return getCase(caseSlug).mentions.filter(query.match); } catch { return []; }
  }, [query, caseSlug]);
  const platforms = useMemo(() => Array.from(new Set(items.map((m) => m.platform))), [items]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "Tab" && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && query && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 92, background: "color-mix(in srgb, #0c0a07 55%, transparent)", display: "flex", justifyContent: "flex-end" }}>
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={query.title}
            onClick={(e) => e.stopPropagation()}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28, ease: [0.7, 0.02, 0.2, 1] }}
            style={{ width: "min(440px, 100%)", height: "100%", background: "var(--surface)", borderLeft: "1px solid var(--border-strong)", display: "flex", flexDirection: "column", boxShadow: "-20px 0 60px rgba(0,0,0,0.4)" }}
          >
            <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="t-micro" style={{ color: "var(--accent)" }}>EVIDENCIA</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginTop: 4, lineHeight: 1.25 }}>{query.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 7, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--font-mono)" }}>{items.length} {items.length === 1 ? "fuente" : "fuentes"}</span>
                  {platforms.length > 0 && <span style={{ display: "inline-flex", gap: 4 }}>{platforms.map((p) => <PlatformBadge key={p} platform={p as PlatformKey} size="sm" />)}</span>}
                </div>
              </div>
              <button ref={closeRef} type="button" onClick={onClose} aria-label="Cerrar" style={{ width: 44, height: 44, marginTop: -8, marginRight: -8, flexShrink: 0, borderRadius: "50%", border: "none", background: "transparent", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {items.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "24px 8px", textAlign: "center", lineHeight: 1.5 }}>Sin menciones que respalden este dato en el período analizado.</div>
              ) : (
                items.map((m) => (
                  <MentionCard key={`${m.platform}-${m.handle}-${m.ts}-${m.body}`} platform={m.platform} author={m.author} handle={m.handle} ts={m.ts} brand={m.brand} body={m.body} thumbType={m.thumbType} sentiment={m.sentiment} isAd={m.isAd} metrics={m.metrics} media={m.media} video={m.video} />
                ))
              )}
              <div style={{ fontSize: 10.5, color: "var(--text-faint)", fontFamily: "var(--font-mono)", textAlign: "center", paddingTop: 4 }}>Menciones del período analizado · evidencia verificable</div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
