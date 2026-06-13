"use client";

import { useEffect, useRef } from "react";

// Global immersive video background — the cover animation that stays behind the
// hero, the wizard and the run dashboard ("siempre en el fondo"). Muted + looped,
// fixed at z-index -1 (the body is transparent so it shows). Paused under
// prefers-reduced-motion, where the poster frame remains.
export function SiteBackground() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      v.pause();
      return;
    }
    v.play().catch(() => {});
  }, []);

  return (
    <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none", overflow: "hidden", background: "var(--bg)" }}>
      <video
        ref={ref}
        src="/hero/hero.mp4"
        poster="/hero/hero-poster.jpg"
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
      {/* legibility scrim — lighter at the top (hero), darker lower (sections) */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,8,16,0.42) 0%, rgba(10,8,16,0.62) 55%, rgba(10,8,16,0.8) 100%)" }} />
    </div>
  );
}
