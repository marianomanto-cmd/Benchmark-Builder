"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import { useI18n } from "@/components/i18n-provider";
import s from "./onboarding.module.css";

// 3-step vortex onboarding shown when a new (logged-out) user clicks
// "Comencemos". The vortex absorbs (1) the user's context, (2) the category's
// information & data, and (3) emits a single report. "¡Entendido!"/"Saltar" →
// onFinish (the parent opens the wizard). Port of the design handoff prototype.

const CTX = ["onb.ctx0", "onb.ctx1", "onb.ctx2", "onb.ctx3", "onb.ctx4"];
const DATA = ["onb.data0", "onb.data1", "onb.data2", "onb.data3", "onb.data4", "onb.data5", "onb.data6"];
const REP_BARS = [{ nm: "Wingo", w: 100, lead: true }, { nm: "Avianca", w: 57 }, { nm: "LATAM", w: 46 }];
const GRAD = "linear-gradient(135deg, #ff4d6d, #f72b6b)";

export function Onboarding({ onFinish }: { onFinish: () => void }) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [vizW, setVizW] = useState(360);
  const [repFilled, setRepFilled] = useState(false);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const vizRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef(1);
  const reducedRef = useRef(false);

  // measure the viz so labels can be placed on a ring (px from center)
  useEffect(() => {
    const measure = () => { if (vizRef.current) setVizW(vizRef.current.clientWidth); };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // vortex canvas (reads modeRef each frame so step changes recolor/dim live)
  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reducedRef.current = reduced;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0, cx = 0, cy = 0, coreR = 0, outR = 0, raf = 0;
    function size() {
      const r = cv!.getBoundingClientRect();
      W = r.width || 320; H = r.height || 320;
      cv!.width = W * dpr; cv!.height = H * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W / 2; cy = H / 2;
      const m = Math.min(W, H); coreR = m * 0.18; outR = m * 0.55;
    }
    size();
    type P = { a: number; r: number; s: number; br: boolean; w: number };
    const N = reduced ? 0 : Math.min(110, Math.round(window.innerWidth / 9));
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
      ctx!.strokeStyle = "rgba(247,43,107,0.95)"; ctx!.lineWidth = 1.8;
      ctx!.shadowColor = "rgba(247,43,107,0.85)"; ctx!.shadowBlur = mode === 3 ? 26 : 15;
      ctx!.stroke(); ctx!.shadowBlur = 0;
      raf = requestAnimationFrame(frame);
    }
    function drawStatic() {
      ctx!.fillStyle = "#0a0810"; ctx!.fillRect(0, 0, W, H);
      for (let arm = 0; arm < 3; arm++) for (let tt = 0; tt < 64; tt++) {
        const r = coreR + (outR - coreR) * (tt / 64), a = arm * 2.09 + tt * 0.18;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        ctx!.fillStyle = `rgba(242,58,94,${0.15 + (1 - r / outR) * 0.6})`;
        ctx!.beginPath(); ctx!.arc(x, y, 1.1, 0, 6.283); ctx!.fill();
      }
      ctx!.beginPath(); ctx!.arc(cx, cy, coreR, 0, 6.283);
      ctx!.strokeStyle = "rgba(247,43,107,0.95)"; ctx!.lineWidth = 1.8; ctx!.stroke();
    }
    const onResize = () => { size(); if (reduced) drawStatic(); };
    window.addEventListener("resize", onResize);
    if (reduced) drawStatic(); else raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);

  useEffect(() => { modeRef.current = step + 1; }, [step]);
  useEffect(() => {
    if (step !== 2) { setRepFilled(false); return; }
    const id = setTimeout(() => setRepFilled(true), 300);
    return () => clearTimeout(id);
  }, [step]);

  const labels = step === 0 ? CTX : step === 1 ? DATA : [];
  const R = vizW * 0.34;
  const advance = () => { if (step < 2) setStep(step + 1); else onFinish(); };
  const copy = (a: string, em: string, b: string) => (<>{t(a)}<b>{t(em)}</b>{t(b)}</>);

  return (
    <motion.div className={s.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <div className={s.wrap}>
        <div className={s.top}>
          <div className={s.dots}>
            {[0, 1, 2].map((k) => <span key={k} className={`${s.dot} ${k === step ? s.dotOn : ""}`} />)}
          </div>
          <button type="button" className={s.skip} onClick={onFinish}>{t("onb.skip")}</button>
        </div>

        <div className={s.eyebrow}>{t(`onb.eb${step}`)}</div>
          <div className={s.viz} ref={vizRef}>
            <canvas ref={cvRef} className={s.canvas} aria-hidden />
            <div className={s.ov}>
              {labels.map((key, idx) => {
                const ang = (idx / labels.length) * 6.283 + 0.5;
                const ox = Math.round(Math.cos(ang) * R);
                const oy = Math.round(Math.sin(ang) * R * 0.86);
                const style = reducedRef.current
                  ? { transform: `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))` }
                  : { "--ox": `${ox}px`, "--oy": `${oy}px`, animationDelay: `${idx * 0.3}s` };
                return (
                  <div key={key} className={`${s.tag} ${step === 0 ? s.tagCtx : ""} ${reducedRef.current ? "" : s.absorb}`} style={style as CSSProperties}>
                    {t(key)}
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
                        <div className={s.repFl} style={{ transform: `scaleX(${repFilled ? b.w / 100 : 0})`, transitionDelay: `${0.3 + k * 0.12}s`, background: b.lead ? GRAD : "var(--text-faint)" }} />
                      </div>
                    </div>
                  ))}
                  <div className={s.repPill}><span style={{ color: "#f72b6b" }}>✓</span> {t("onb.repPill")}</div>
                </div>
              )}
            </div>
          </div>
          <p className={s.phrase} key={step}>
            {step === 0 ? copy("onb.c0a", "onb.c0em", "onb.c0b") : step === 1 ? copy("onb.c1a", "onb.c1em", "onb.c1b") : copy("onb.c2a", "onb.c2em", "onb.c2b")}
          </p>

        <button type="button" className={s.next} onClick={advance}>{step === 2 ? t("onb.done") : t("onb.next")}</button>
      </div>
    </motion.div>
  );
}
