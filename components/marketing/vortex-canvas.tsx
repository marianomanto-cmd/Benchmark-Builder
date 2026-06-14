"use client";

import { useEffect, useRef, type CSSProperties } from "react";

// "El vórtice": the category's signals spiral inward and burn up as they reach an
// incandescent core — a direct nod to the logo. Canvas 2D port of the design
// handoff prototype (refs/Que-hace.html → variant C). dpr clamped ≤2, pauses its
// rAF loop when offscreen, draws a static frame under prefers-reduced-motion.
export function VortexCanvas({ className, style }: { className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let W = 0, H = 0, cx = 0, cy = 0, coreR = 0, outR = 0;
    function size() {
      W = canvas!.clientWidth;
      H = canvas!.clientHeight;
      canvas!.width = Math.max(1, W * dpr);
      canvas!.height = Math.max(1, H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W / 2;
      cy = H / 2;
      coreR = W * 0.255;
      outR = W * 0.5;
    }

    type P = { a: number; r: number; s: number; br: boolean; w: number };
    const N = reduced ? 0 : 130;
    const ps: P[] = [];
    function spawn(p: P, init = false) {
      p.a = Math.random() * 6.283;
      p.r = init ? coreR + Math.random() * (outR - coreR) : outR * (0.9 + Math.random() * 0.12);
      p.s = 0.5 + Math.random() * 0.8;
      p.br = Math.random() < 0.16;
      p.w = Math.random() * 1.1 + 0.3;
    }

    // The logo's accretion line across the core.
    function streak() {
      const g = ctx!.createLinearGradient(0, cy, W, cy);
      g.addColorStop(0, "rgba(242,58,94,0)");
      g.addColorStop(0.5, "rgba(255,120,150,0.42)");
      g.addColorStop(1, "rgba(242,58,94,0)");
      ctx!.fillStyle = g;
      ctx!.fillRect(0, cy - 0.8, W, 1.6);
    }

    let raf = 0;
    let running = false;
    function frame() {
      ctx!.fillStyle = "rgba(10,8,16,0.18)"; // persistence trail (= --bg)
      ctx!.fillRect(0, 0, W, H);
      streak();
      for (const p of ps) {
        const px = cx + Math.cos(p.a) * p.r, py = cy + Math.sin(p.a) * p.r;
        p.r -= p.s * (0.25 + (1 - p.r / outR) * 0.9) * 0.55; // accelerate inward
        p.a += 0.004 + (1 - p.r / outR) * 0.055; // spin faster near the core
        if (p.r <= coreR) { spawn(p); continue; }
        const nx = cx + Math.cos(p.a) * p.r, ny = cy + Math.sin(p.a) * p.r;
        const al = Math.min(0.92, 0.12 + (1 - p.r / outR) * 0.9);
        ctx!.strokeStyle = p.br ? `rgba(255,125,155,${al})` : `rgba(242,58,94,${al * 0.78})`;
        ctx!.lineWidth = p.w;
        ctx!.beginPath();
        ctx!.moveTo(px, py);
        ctx!.lineTo(nx, ny);
        ctx!.stroke();
        if (p.br) {
          ctx!.fillStyle = `rgba(255,160,185,${al})`;
          ctx!.beginPath();
          ctx!.arc(nx, ny, p.w * 0.9, 0, 6.28);
          ctx!.fill();
        }
      }
      raf = requestAnimationFrame(frame);
    }

    function drawStatic() {
      ctx!.fillStyle = "#0a0810";
      ctx!.fillRect(0, 0, W, H);
      streak();
      for (let arm = 0; arm < 3; arm++) {
        for (let t = 0; t < 70; t++) {
          const r = coreR + (outR - coreR) * (t / 70), a = arm * 2.094 + t * 0.17;
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, al = 0.15 + (1 - r / outR) * 0.7;
          ctx!.fillStyle = `rgba(242,58,94,${al})`;
          ctx!.beginPath();
          ctx!.arc(x, y, 1, 0, 6.28);
          ctx!.fill();
        }
      }
    }

    function start() { if (running || reduced) return; running = true; raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    size();
    for (let i = 0; i < N; i++) { const p = {} as P; spawn(p, true); ps.push(p); }
    if (reduced) drawStatic();
    else start();

    const onResize = () => { size(); if (reduced) drawStatic(); };
    window.addEventListener("resize", onResize);

    const io = new IntersectionObserver(
      (entries) => { for (const e of entries) { if (e.isIntersecting) start(); else stop(); } },
      { threshold: 0.05 },
    );
    io.observe(canvas);

    return () => { stop(); io.disconnect(); window.removeEventListener("resize", onResize); };
  }, []);

  return <canvas ref={ref} className={className} style={style} aria-hidden="true" />;
}
