"use client";

import { useEffect, useRef } from "react";

// "Ruido → inteligencia": a field of signal/noise particles that drift, then
// converge into an ordered lattice (a report readout). Canvas 2D, no deps.
// Pauses its rAF loop when offscreen; renders a static final state under
// prefers-reduced-motion. dpr clamped ≤2 for performance.
export function HeroCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const INK = "#f4f1ea";
    const ACC = "#f23a5e";
    const SIGNAL = 34;
    const NOISE = 66;
    const TOTAL = SIGNAL + NOISE;

    let W = 0;
    let H = 0;
    let anchors: { x: number; y: number }[] = [];
    type Node = {
      x: number; y: number; vx: number; vy: number; sig: boolean; hero: boolean;
      r: number; col: string; alpha: number; ai: number; ph: number; bx?: number; by?: number;
    };
    let nodes: Node[] = [];

    function layout() {
      anchors = [];
      const cols = 8;
      const rows = 4;
      const padX = W * 0.16;
      const padY1 = H * 0.5;
      const padY2 = H * 0.84;
      const gw = (W - padX * 2) / (cols - 1);
      const gh = (padY2 - padY1) / (rows - 1);
      for (let r = 0; r < rows; r++) for (let i = 0; i < cols; i++) anchors.push({ x: padX + i * gw, y: padY1 + r * gh });
    }
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);

    function size() {
      W = canvas!.clientWidth;
      H = canvas!.clientHeight;
      canvas!.width = Math.max(1, W * dpr);
      canvas!.height = Math.max(1, H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      layout();
    }
    function init() {
      nodes = [];
      for (let i = 0; i < TOTAL; i++) {
        const sig = i < SIGNAL;
        nodes.push({
          x: rnd(0, W), y: rnd(0, H), vx: rnd(-0.55, 0.55), vy: rnd(-0.55, 0.55),
          sig, hero: i === 0, r: sig ? (i === 0 ? 6 : rnd(2.4, 4)) : rnd(1.4, 2.6),
          col: i % 11 === 0 ? ACC : INK, alpha: sig ? rnd(0.55, 0.95) : rnd(0.2, 0.5), ai: 0, ph: rnd(0, 6.28),
        });
      }
    }

    const CONV = 2.4;
    let t0: number | null = null;
    let raf = 0;
    let running = false;

    function frame(ts: number) {
      if (t0 === null) t0 = ts;
      const t = (ts - t0) / 1000;
      ctx!.clearRect(0, 0, W, H);

      if (t > CONV + 0.2) {
        ctx!.strokeStyle = "rgba(244,241,234,.06)";
        ctx!.lineWidth = 1;
        for (let a = 0; a < SIGNAL; a++) {
          const n = nodes[a];
          if (!n) continue;
          for (let b = a + 1; b < SIGNAL; b++) {
            const m = nodes[b];
            const dx = n.x - m.x;
            const dy = n.y - m.y;
            if (dx * dx + dy * dy < 9000) {
              ctx!.beginPath();
              ctx!.moveTo(n.x, n.y);
              ctx!.lineTo(m.x, m.y);
              ctx!.stroke();
            }
          }
        }
      }

      for (const n of nodes) {
        if (t < CONV) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 0 || n.x > W) n.vx *= -1;
          if (n.y < 0 || n.y > H) n.vy *= -1;
        } else if (n.sig) {
          const an = anchors[n.ai || (n.ai = nodes.indexOf(n) % anchors.length)];
          n.x += (an.x - n.x) * 0.07;
          n.y += (an.y - n.y) * 0.07;
          n.bx = Math.sin((t + n.ph) * 1.1) * 1.6;
          n.by = Math.cos((t + n.ph) * 1.0) * 1.6;
        } else {
          n.alpha *= 0.9;
          n.y += 0.6;
        }
        const px = n.x + (n.bx || 0);
        const py = n.y + (n.by || 0);
        if (n.hero && t > CONV) {
          ctx!.beginPath();
          ctx!.arc(px, py, n.r + 6, 0, 6.2832);
          ctx!.strokeStyle = "rgba(242,58,94,.55)";
          ctx!.lineWidth = 1.4;
          ctx!.stroke();
        }
        ctx!.beginPath();
        ctx!.arc(px, py, n.r, 0, 6.2832);
        ctx!.fillStyle = n.hero ? ACC : n.col;
        ctx!.globalAlpha = Math.max(n.alpha, 0);
        ctx!.fill();
        ctx!.globalAlpha = 1;
      }
      raf = requestAnimationFrame(frame);
    }

    function drawStatic() {
      ctx!.clearRect(0, 0, W, H);
      for (let i = 0; i < SIGNAL; i++) {
        const a = anchors[i % anchors.length];
        ctx!.beginPath();
        ctx!.arc(a.x, a.y, i === 0 ? 6 : 3, 0, 6.2832);
        ctx!.fillStyle = i === 0 ? ACC : INK;
        ctx!.globalAlpha = 0.85;
        ctx!.fill();
        ctx!.globalAlpha = 1;
      }
    }

    function start() {
      if (running || reduced) return;
      running = true;
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    size();
    init();
    if (reduced) {
      drawStatic();
    } else {
      start();
    }

    const onResize = () => {
      size();
      init();
      t0 = null;
      if (reduced) drawStatic();
    };
    window.addEventListener("resize", onResize);

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) start();
          else stop();
        }
      },
      { threshold: 0.05 },
    );
    io.observe(canvas);

    return () => {
      stop();
      io.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
