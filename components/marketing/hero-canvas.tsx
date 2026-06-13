"use client";

import { useEffect, useRef } from "react";

// Immersive "data dive": we fly forward through a 3D field of data particles;
// brighter nodes wire into a shifting network — the feeling of slipping inside
// the social graph. Canvas 2D, no deps. dpr clamped ≤2, pauses its rAF loop
// when offscreen, renders a static frame under prefers-reduced-motion, and adds
// a light mouse parallax.
export function HeroCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const INK = "244,241,234";
    const ACC = "242,58,94";
    const BG = "10,8,16";

    let W = 0, H = 0, focal = 0, cx = 0, cy = 0;
    let mx = 0, my = 0; // parallax target
    let ox = 0, oy = 0; // smoothed offset

    type P = { x: number; y: number; z: number; node: boolean; acc: boolean };
    let ps: P[] = [];
    let COUNT = 160;

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    function spawn(p: P, far = false) {
      p.x = rnd(-1, 1);
      p.y = rnd(-1, 1);
      p.z = far ? rnd(0.9, 1) : rnd(0.08, 1);
    }
    function size() {
      W = canvas!.clientWidth;
      H = canvas!.clientHeight;
      canvas!.width = Math.max(1, W * dpr);
      canvas!.height = Math.max(1, H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      focal = Math.min(W, H) * 0.9;
      cx = W / 2;
      cy = H / 2;
      COUNT = W < 640 ? 90 : 160;
      if (ps.length !== COUNT) {
        ps = Array.from({ length: COUNT }, (_, i) => {
          const p: P = { x: 0, y: 0, z: 0, node: i % 6 === 0, acc: i % 13 === 0 };
          spawn(p);
          return p;
        });
      }
    }
    function project(p: P) {
      const s = focal / p.z;
      return {
        sx: cx + (p.x + ox) * s * 0.5,
        sy: cy + (p.y + oy) * s * 0.5,
        r: Math.max(0.3, (1 / p.z) * (p.node ? 1.7 : 0.9)),
      };
    }

    const SPEED = 0.0042;
    let raf = 0;
    let running = false;

    function frame() {
      // motion-persistence trail (also paints the dark backdrop)
      ctx!.fillStyle = `rgba(${BG},0.30)`;
      ctx!.fillRect(0, 0, W, H);
      ox += (mx - ox) * 0.04;
      oy += (my - oy) * 0.04;

      const proj: { sx: number; sy: number; acc: boolean }[] = [];
      for (const p of ps) {
        p.z -= SPEED;
        if (p.z <= 0.05) spawn(p, true);
        const { sx, sy, r } = project(p);
        if (sx < -60 || sx > W + 60 || sy < -60 || sy > H + 60) continue;
        const depth = 1 - p.z; // 0 far → 1 near
        const a = Math.min(0.95, 0.12 + depth * 0.9);
        ctx!.beginPath();
        ctx!.arc(sx, sy, r, 0, 6.2832);
        ctx!.fillStyle = p.acc ? `rgba(${ACC},${a})` : `rgba(${INK},${a * 0.7})`;
        ctx!.fill();
        if (p.node) proj.push({ sx, sy, acc: p.acc });
      }
      // network links between nearby projected nodes
      for (let i = 0; i < proj.length; i++) {
        for (let j = i + 1; j < proj.length; j++) {
          const dx = proj[i].sx - proj[j].sx;
          const dy = proj[i].sy - proj[j].sy;
          const d2 = dx * dx + dy * dy;
          if (d2 < 16000) {
            const a = (1 - d2 / 16000) * 0.2;
            ctx!.strokeStyle = proj[i].acc || proj[j].acc ? `rgba(${ACC},${a})` : `rgba(${INK},${a * 0.6})`;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(proj[i].sx, proj[i].sy);
            ctx!.lineTo(proj[j].sx, proj[j].sy);
            ctx!.stroke();
          }
        }
      }
      raf = requestAnimationFrame(frame);
    }

    function drawStatic() {
      ctx!.fillStyle = `rgba(${BG},1)`;
      ctx!.fillRect(0, 0, W, H);
      for (const p of ps) {
        const { sx, sy, r } = project(p);
        ctx!.beginPath();
        ctx!.arc(sx, sy, r, 0, 6.2832);
        ctx!.fillStyle = p.acc ? `rgba(${ACC},0.85)` : `rgba(${INK},0.5)`;
        ctx!.fill();
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
    if (reduced) drawStatic();
    else start();

    const onResize = () => {
      size();
      if (reduced) drawStatic();
    };
    const onMove = (e: PointerEvent) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 0.6;
      my = (e.clientY / window.innerHeight - 0.5) * 0.6;
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onMove, { passive: true });

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
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
