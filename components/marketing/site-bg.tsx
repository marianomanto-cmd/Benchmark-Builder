"use client";

import { HeroCanvas } from "@/components/marketing/hero-canvas";

// Global immersive background — the "data dive" that stays behind the hero, the
// wizard and the run dashboard ("siempre en el fondo"). Lives in the root layout
// so it persists across navigation (never re-mounts / cuts).
//
// Uses the Canvas 2D particle/network field (HeroCanvas): crisp at any
// resolution and DPR (no video compression blur on the near floating dots),
// zero download, paused under prefers-reduced-motion. A legibility scrim sits on
// top — lighter at the hero, darker lower down.
export function SiteBackground() {
  return (
    <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none", overflow: "hidden", background: "var(--bg)" }}>
      <HeroCanvas style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
      {/* legibility scrim — lighter at the top (hero), darker lower (sections) */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,8,16,0.28) 0%, rgba(10,8,16,0.5) 55%, rgba(10,8,16,0.8) 100%)" }} />
    </div>
  );
}
