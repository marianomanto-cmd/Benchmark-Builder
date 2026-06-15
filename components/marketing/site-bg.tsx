"use client";

import { useEffect, useRef, type RefObject } from "react";

// Global immersive video background — the cover animation that stays behind the
// hero, the wizard and the run dashboard ("siempre en el fondo"). Lives in the
// root layout so it persists across navigation (never re-mounts / cuts).
//
// Seamless loop via crossfade: two stacked <video> elements ping-pong — as one
// nears its end the other starts and we crossfade opacity, so there's no hard
// cut and no dark dip ("fade y vuelve a empezar"). Muted; paused under
// prefers-reduced-motion (poster stays).
export function SiteBackground() {
  const aRef = useRef<HTMLVideoElement>(null);
  const bRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const a = aRef.current;
    const b = bRef.current;
    if (!a || !b) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      a.pause();
      b.pause();
      return;
    }

    const FADE = 0.9; // seconds
    let cur = a;
    let nxt = b;
    let swapping = false;

    cur.style.opacity = "1";
    nxt.style.opacity = "0";
    cur.play().catch(() => {});

    const onTime = (e: Event) => {
      if (swapping || e.target !== cur) return;
      const d = cur.duration;
      if (!d || Number.isNaN(d)) return;
      if (cur.currentTime >= d - FADE) {
        swapping = true;
        nxt.currentTime = 0;
        nxt.play().catch(() => {});
        cur.style.opacity = "0";
        nxt.style.opacity = "1";
        const finishing = cur;
        window.setTimeout(() => {
          finishing.pause();
          const t = cur;
          cur = nxt;
          nxt = t;
          swapping = false;
        }, FADE * 1000);
      }
    };

    a.addEventListener("timeupdate", onTime);
    b.addEventListener("timeupdate", onTime);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      b.removeEventListener("timeupdate", onTime);
    };
  }, []);

  const vid = (r: RefObject<HTMLVideoElement | null>, first: boolean) => (
    <video
      ref={r}
      src="/hero/hero.mp4"
      poster={first ? "/hero/hero-poster.jpg" : undefined}
      muted
      playsInline
      autoPlay={first}
      preload="auto"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: first ? 1 : 0, transition: "opacity 0.9s ease-in-out" }}
    />
  );

  return (
    <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none", overflow: "hidden", background: "var(--bg)" }}>
      {/* Only the video imagery does the gentle "camera" push-in (var set on <html>
          by MarketingHero) — the scrim is NOT scaled, so there's no brightness
          shift/"cut". Very subtle (1.05) + slow ease so it reads as smooth. */}
      <div style={{ position: "absolute", inset: 0, transform: "scale(var(--site-cam-scale, 1))", transformOrigin: "center", transition: "transform 2.2s cubic-bezier(.22, .61, .36, 1)", willChange: "transform" }}>
        {vid(aRef, true)}
        {vid(bRef, false)}
      </div>
      {/* legibility scrim — lighter at the top (hero), darker lower (sections) */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,8,16,0.28) 0%, rgba(10,8,16,0.5) 55%, rgba(10,8,16,0.8) 100%)" }} />
    </div>
  );
}
