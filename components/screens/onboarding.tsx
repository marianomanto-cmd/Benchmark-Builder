"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import { ArrowRight, ArrowLeft, X } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import s from "./onboarding.module.css";

// Cinematic "Comencemos" → onboarding → wizard transition. The scene lives OVER
// the persistent global background video (never remounts it): the hero recedes
// (driven by the parent), a translucent core-panel emerges from the center and
// 3 steps play, then the panel collapses and the wizard emerges from the same
// point. The background "camera" push-in is the `--site-cam-scale` var the parent
// sets on <html>. 3 beats: (1) your context, (2) information & data, (3) report.

const CTX = ["onb.ctx0", "onb.ctx1", "onb.ctx2", "onb.ctx3", "onb.ctx4"];
const DATA = ["onb.data0", "onb.data1", "onb.data2", "onb.data3", "onb.data4", "onb.data5", "onb.data6"];
const REP_BARS = [{ nm: "Wingo", w: 100, lead: true }, { nm: "Avianca", w: 57 }, { nm: "LATAM", w: 46 }];
const GRAD = "linear-gradient(135deg, #ff4d6d, #f72b6b)";
const EASE = [0.7, 0.02, 0.2, 1] as const;

export function Onboarding({ onFinish, onCancel }: { onFinish: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [vizW, setVizW] = useState(420);
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
  const Rx = Math.min(vizW * 0.34, 168);
  const Ry = 42;
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

      <button type="button" className={s.skip} onClick={onFinish}>{t("onb.skip")} <X size={12} /></button>

      <motion.div
        className={s.panel}
        initial={{ scale: 0.82 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.86, opacity: 0, filter: "blur(6px)" }}
        transition={{ duration: 0.6, ease: EASE }}
      >
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
          {labels.map((key, idx) => {
            const ang = (idx / labels.length) * 6.283 + 0.5;
            const ox = Math.round(Math.cos(ang) * Rx);
            const oy = Math.round(Math.sin(ang) * Ry);
            // Always set the ring offset + absorb animation; under reduced motion
            // the CSS freezes each tag at its ring position (no JS branch needed).
            const style = { "--ox": `${ox}px`, "--oy": `${oy}px`, animationDelay: `${idx * 0.26}s` } as CSSProperties;
            return (
              <div key={key} className={`${s.tag} ${step === 0 ? s.tagCtx : ""} ${s.absorb}`} style={style}>
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
      </motion.div>
    </motion.div>
  );
}
