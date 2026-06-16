"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, ArrowLeft, X } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import s from "./onboarding.module.css";

// Cinematic "Comencemos" → onboarding → wizard transition. The scene lives OVER
// the persistent global background video (never remounts it): the hero recedes
// (driven by the parent), a translucent core-panel emerges from the center with
// a vortex into which the concept tags are absorbed, then the panel collapses
// and the wizard emerges from the same point. The background "camera" push-in is
// the `--site-cam-scale` var the parent sets on <html>. 3 beats: (1) your
// context, (2) information & data, (3) report.

const CTX = ["onb.ctx0", "onb.ctx1", "onb.ctx2", "onb.ctx3", "onb.ctx4"];
const DATA = ["onb.data0", "onb.data1", "onb.data2", "onb.data3", "onb.data4", "onb.data5", "onb.data6"];
const REP_BARS = [{ nm: "Wingo", w: 100, lead: true }, { nm: "Avianca", w: 57 }, { nm: "LATAM", w: 46 }];
const GRAD = "linear-gradient(135deg, #ff4d6d, #f72b6b)";
const EASE = [0.7, 0.02, 0.2, 1] as const;

// In-panel vortex: particles spiral into an incandescent core; recolors per step
// (coral → neutral/white → dimmed). The frame loop reads the live mode from a ref.
function PanelVortex({ step }: { step: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(1);
  useEffect(() => { modeRef.current = step + 1; }, [step]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0, cx = 0, cy = 0, coreR = 0, outR = 0, raf = 0;
    function size() {
      W = cv!.clientWidth || 200; H = cv!.clientHeight || 150;
      cv!.width = Math.max(1, W * dpr); cv!.height = Math.max(1, H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W / 2; cy = H / 2;
      const m = Math.min(W, H); coreR = m * 0.16; outR = m * 0.52;
    }
    size();
    type P = { a: number; r: number; s: number; br: boolean; w: number };
    const N = reduced ? 0 : 90;
    const ps: P[] = [];
    function spawn(p: P, init = false) {
      p.a = Math.random() * 6.283;
      p.r = init ? coreR + Math.random() * (outR - coreR) : outR * (0.9 + Math.random() * 0.14);
      p.s = 0.4 + Math.random() * 0.7;
      p.br = Math.random() < 0.18;
      p.w = Math.random() + 0.4;
    }
    for (let i = 0; i < N; i++) { const p = {} as P; spawn(p, true); ps.push(p); }
    function frame() {
      const mode = modeRef.current;
      ctx!.fillStyle = "rgba(10,8,16,0.20)";
      ctx!.fillRect(0, 0, W, H);
      const k = mode === 3 ? 0.5 : 1;
      for (const p of ps) {
        const px = cx + Math.cos(p.a) * p.r, py = cy + Math.sin(p.a) * p.r;
        p.r -= (p.s * (0.25 + (1 - p.r / outR) * 0.9)) * 0.5 * k;
        p.a += (0.004 + (1 - p.r / outR) * 0.05) * k;
        if (p.r <= coreR) { spawn(p); continue; }
        const nx = cx + Math.cos(p.a) * p.r, ny = cy + Math.sin(p.a) * p.r;
        const al = Math.min(0.9, 0.12 + (1 - p.r / outR) * 0.9) * (mode === 3 ? 0.55 : 1);
        ctx!.strokeStyle = mode === 2
          ? (p.br ? `rgba(244,241,234,${al})` : `rgba(150,144,160,${al * 0.8})`)
          : (p.br ? `rgba(255,125,155,${al})` : `rgba(242,58,94,${al * 0.8})`);
        ctx!.lineWidth = p.w;
        ctx!.beginPath(); ctx!.moveTo(px, py); ctx!.lineTo(nx, ny); ctx!.stroke();
      }
      ctx!.beginPath(); ctx!.arc(cx, cy, coreR, 0, 6.283);
      ctx!.strokeStyle = "rgba(247,43,107,0.95)"; ctx!.lineWidth = 1.6;
      ctx!.shadowColor = "rgba(247,43,107,0.85)"; ctx!.shadowBlur = mode === 3 ? 24 : 14;
      ctx!.stroke(); ctx!.shadowBlur = 0;
      raf = requestAnimationFrame(frame);
    }
    function drawStatic() {
      ctx!.fillStyle = "#0a0810"; ctx!.fillRect(0, 0, W, H);
      for (let arm = 0; arm < 3; arm++) for (let tt = 0; tt < 60; tt++) {
        const r = coreR + (outR - coreR) * (tt / 60), a = arm * 2.09 + tt * 0.18;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        ctx!.fillStyle = `rgba(242,58,94,${0.15 + (1 - r / outR) * 0.6})`;
        ctx!.beginPath(); ctx!.arc(x, y, 1, 0, 6.283); ctx!.fill();
      }
      ctx!.beginPath(); ctx!.arc(cx, cy, coreR, 0, 6.283);
      ctx!.strokeStyle = "rgba(247,43,107,0.95)"; ctx!.lineWidth = 1.6; ctx!.stroke();
    }
    const onResize = () => { size(); if (reduced) drawStatic(); };
    window.addEventListener("resize", onResize);
    if (reduced) drawStatic(); else raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);

  return <canvas ref={ref} className={s.vortex} aria-hidden />;
}

export function Onboarding({ onFinish, onCancel }: { onFinish: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [vizW, setVizW] = useState(440);
  const vizRef = useRef<HTMLDivElement>(null);

  // Lock page scroll while the (translucent) scene is open so sections below the
  // fold can't peek through; restore on unmount.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Measure the visual area so absorbed tags sit on a ring (px from center).
  useEffect(() => {
    const measure = () => { if (vizRef.current) setVizW(vizRef.current.clientWidth); };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Escape cancels back to the hero.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const labels = step === 0 ? CTX : step === 1 ? DATA : [];
  const Rx = Math.min(vizW * 0.3, 150);
  const Ry = 54;
  const advance = () => { if (step < 2) setStep(step + 1); else onFinish(); };
  const back = () => setStep((p) => Math.max(0, p - 1));
  const title = (a: string, em: string, b: string) => (<>{t(a)}<em className={s.em}>{t(em)}</em>{t(b)}</>);

  return (
    <motion.div className={s.scene} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
      {/* center scrim (focuses the panel, keeps the video visible) */}
      <div className={s.scrim} aria-hidden />
      {/* per-step accent tint over the video — coral / neutral / dimmed (crossfaded) */}
      <div className={`${s.tint} ${s.tint0}`} style={{ opacity: step === 0 ? 1 : 0 }} aria-hidden />
      <div className={`${s.tint} ${s.tint1}`} style={{ opacity: step === 1 ? 1 : 0 }} aria-hidden />
      <div className={`${s.tint} ${s.tint2}`} style={{ opacity: step === 2 ? 1 : 0 }} aria-hidden />

      <motion.div
        className={s.panel}
        initial={{ scale: 0.82 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.86, opacity: 0, filter: "blur(6px)" }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <button type="button" className={s.close} onClick={onCancel} aria-label={t("onb.exit")}><X size={15} /></button>
        <div className={s.dots}>
          {[0, 1, 2].map((k) => <span key={k} className={`${s.dot} ${k === step ? s.dotOn : ""}`} />)}
        </div>

        <motion.div key={step} initial={{ y: 10 }} animate={{ y: 0 }} transition={{ duration: 0.42, ease: EASE }}>
          <div className={s.eyebrow}>{t("onb.step")} {step + 1} · {t(`onb.eb${step}`)}</div>
          <h2 className={s.title}>
            {step === 0 ? title("onb.c0a", "onb.c0em", "onb.c0b") : step === 1 ? title("onb.c1a", "onb.c1em", "onb.c1b") : title("onb.c2a", "onb.c2em", "onb.c2b")}
          </h2>
          <p className={s.body}>{t(`onb.b${step}`)}</p>
        </motion.div>

        <div className={s.visual} ref={vizRef}>
          <PanelVortex step={step} />
          {labels.map((key, idx) => {
            const ang = (idx / labels.length) * 6.283 + 0.5;
            const ox = Math.round(Math.cos(ang) * Rx);
            const oy = Math.round(Math.sin(ang) * Ry);
            // Tags glide into the vortex core via motion (GPU-composited x/y — no
            // CSS var-in-calc, so no stutter). Reduced motion → static on the ring.
            return (
              <div key={key} className={s.tagLayer}>
                <motion.div
                  className={`${s.tag} ${step === 0 ? s.tagCtx : ""}`}
                  initial={reduce ? { x: ox, y: oy } : { x: ox, y: oy, opacity: 0 }}
                  animate={reduce
                    ? { x: ox, y: oy, opacity: 0.9 }
                    : { x: [ox, Math.round(ox * 0.8), Math.round(ox * 0.18), 0], y: [oy, Math.round(oy * 0.8), Math.round(oy * 0.18), 0], opacity: [0, 1, 0.7, 0], scale: [1, 1, 1, 0.5] }}
                  transition={reduce ? { duration: 0 } : { duration: 2.8, times: [0, 0.18, 0.8, 1], repeat: Infinity, delay: idx * 0.26, ease: "easeInOut" }}
                >
                  {t(key)}
                </motion.div>
              </div>
            );
          })}
          {step === 2 && (
            <div className={s.rep}>
              <div className={s.repTag}>✦ {t("onb.repTag")}</div>
              <div className={s.repHead}>{t("onb.repHead")}</div>
              {REP_BARS.map((b, k) => (
                <div className={s.repBar} key={b.nm}>
                  <span className={s.repNm}>{b.nm}</span>
                  <div className={s.repTk}>
                    <div className={s.repFl} style={{ "--w": b.w / 100, animationDelay: `${0.25 + k * 0.12}s`, background: b.lead ? GRAD : "var(--text-faint)" } as CSSProperties} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={s.controls}>
          <button type="button" className={s.back} onClick={back} disabled={step === 0}><ArrowLeft size={15} /> {t("onb.back")}</button>
          <button type="button" className={s.next} onClick={advance}>
            {step === 2 ? t("onb.start") : t("onb.next")} <ArrowRight size={16} />
          </button>
        </div>
        <button type="button" className={s.skipLink} onClick={onFinish}>{t("onb.skip")} →</button>
      </motion.div>
    </motion.div>
  );
}
