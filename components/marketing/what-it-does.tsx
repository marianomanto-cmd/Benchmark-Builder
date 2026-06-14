"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Reveal } from "@/components/motion/reveal";
import { useI18n } from "@/components/i18n-provider";
import s from "./marketing.module.css";
import d from "./what-diagram.module.css";

// Animated diagram: the category's noise → a constellation → one reading.
// Deterministic positions (seeded) so SSR and client match; loops; respects
// reduced motion. Colors use the data-viz accent (gold) + warm neutrals.
const VB = { w: 430, h: 560 };
const FOCAL = { x: 215, y: 300 };
const N = 22;
const PALETTE = ["var(--viz-accent)", "#c7bdab", "#8c8696", "#6fa8dc", "#7bd4c4", "#b08968"];
const NOTE_IDX = [3, 10, 17];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Pt = { x: number; y: number; c: string; r: number; delay: number };
type Lnk = { x1: number; y1: number; x2: number; y2: number; len: number; delay: number };

export function WhatItDoes() {
  const { t, locale } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState(0);
  const [count, setCount] = useState(0);
  const [cycle, setCycle] = useState(0);

  const { pts, links } = useMemo(() => {
    const rnd = mulberry32(42);
    const pts: Pt[] = [];
    for (let i = 0; i < N; i++) {
      pts.push({ x: 28 + rnd() * 374, y: 36 + rnd() * 242, c: PALETTE[i % PALETTE.length], r: 1.6 + rnd() * 1.6, delay: rnd() * 0.5 });
    }
    const links: Lnk[] = [];
    for (let i = 0; i < pts.length; i++) {
      let best = -1, bd = 1e9, b2 = -1, bd2 = 1e9;
      for (let j = 0; j < pts.length; j++) {
        if (i === j) continue;
        const dd = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (dd < bd) { b2 = best; bd2 = bd; best = j; bd = dd; }
        else if (dd < bd2) { b2 = j; bd2 = dd; }
      }
      [best, b2].forEach((j) => {
        if (j < 0 || j < i) return;
        const a = pts[i], b = pts[j];
        links.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, len: Math.hypot(a.x - b.x, a.y - b.y), delay: rnd() * 0.8 });
      });
    }
    return { pts, links };
  }, []);

  useEffect(() => {
    setMounted(true);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setPhase(3); setCount(1284); return; }
    const timers: ReturnType<typeof setTimeout>[] = [];
    let raf = 0;
    let alive = true;
    function runCycle() {
      setCycle((c) => c + 1);
      setPhase(0);
      setCount(0);
      const t0 = performance.now();
      const dur = 1400;
      const tick = (now: number) => {
        if (!alive) return;
        const k = Math.min(1, (now - t0) / dur);
        setCount(Math.round(1284 * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      timers.push(setTimeout(() => setPhase(1), 1900));
      timers.push(setTimeout(() => setPhase(2), 3700));
      timers.push(setTimeout(() => setPhase(3), 5100));
      timers.push(setTimeout(runCycle, 9200));
    }
    runCycle();
    return () => { alive = false; timers.forEach(clearTimeout); cancelAnimationFrame(raf); };
  }, []);

  const ebKey = ["what.eb0", "what.eb1", "what.eb2", "what.eb3"][phase];
  const countStr = locale === "en" ? count.toLocaleString("en-US") : count.toLocaleString("es-AR");
  const bars = [
    { y: 448, w: 239, lead: true, lab: "Wingo", val: "41,3%" },
    { y: 468, w: 136, lead: false, lab: "Avianca", val: "23,5%" },
    { y: 488, w: 114, lead: false, lab: "LATAM", val: "19,8%" },
  ];

  return (
    <section id="que-hace" className={s.section}>
      <div className={s.container}>
        <Reveal>
          <div className={s.sectionHead}>
            <div className={s.eyebrow}><span className="eyebrow-dot" /> {t("what.eyebrow")}</div>
            <h2 className="t-section statement">
              {t("what.h2a")}<span style={{ color: "var(--viz-accent)", fontWeight: 500 }}>{t("what.h2noise")}</span>{t("what.h2b")}<em style={{ color: "var(--text)" }}>{t("what.h2em")}</em>{t("what.h2c")}
            </h2>
          </div>
        </Reveal>

        <div className={d.stage}>
          <div className={d.ebRow}><span className={d.led} /><span className={d.ebText} key={ebKey}>{t(ebKey)}</span></div>
          <svg className={d.svg} viewBox={`0 0 ${VB.w} ${VB.h}`} role="img" aria-label={t("what.eyebrow")}>
            <defs>
              <radialGradient id="vizFocus" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="var(--viz-accent)" stopOpacity="0.85" />
                <stop offset="1" stopColor="var(--viz-accent)" stopOpacity="0" />
              </radialGradient>
            </defs>

            <text className={`${d.count} ${mounted && phase < 3 ? d.countShow : ""}`} x="14" y="20">{t("what.count", { n: countStr })}</text>

            <g>
              {links.map((l, i) => (
                <line key={i} className={`${d.lnk} ${phase === 1 ? d.draw : phase >= 2 ? d.gone : ""}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} style={{ "--len": l.len.toFixed(1), transitionDelay: `${l.delay.toFixed(2)}s` } as CSSProperties} />
              ))}
            </g>

            <circle cx={FOCAL.x} cy={FOCAL.y} r="34" fill="url(#vizFocus)" opacity={phase === 2 ? 0.85 : 0} style={{ transition: "opacity .6s ease" }} />
            <circle key={cycle} className={`${d.pulse} ${phase === 2 ? d.pulseOn : ""}`} cx={FOCAL.x} cy={FOCAL.y} r="6" />

            <g>
              {pts.map((p, i) => (
                <g key={i} className={`${d.node} ${mounted ? d.show : ""} ${phase >= 2 ? d.converge : d.scatter}`} style={{ "--tx": `${(p.x - FOCAL.x).toFixed(1)}px`, "--ty": `${(p.y - FOCAL.y).toFixed(1)}px`, transitionDelay: `${p.delay.toFixed(2)}s` } as CSSProperties}>
                  <circle cx={FOCAL.x} cy={FOCAL.y} r={p.r.toFixed(1)} fill={p.c} style={{ filter: `drop-shadow(0 0 4px ${p.c})` }} />
                </g>
              ))}
              {NOTE_IDX.map((idx, k) => {
                const p = pts[idx];
                if (!p) return null;
                return <text key={`n${k}`} className={`${d.note} ${mounted && phase === 0 ? d.noteShow : ""}`} x={Math.min(p.x + 8, 250)} y={p.y - 6}>{t(`what.note${k}`)}</text>;
              })}
            </g>

            <g className={`${d.lectura} ${phase === 3 ? d.lecturaShow : ""}`}>
              <rect className={d.lcard} x="14" y="330" width="402" height="214" rx="16" />
              <text className={d.ltag} x="32" y="364">{t("what.ltag")}</text>
              <text className={d.lhead} x="32" y="392">{t("what.lhead")}</text>
              <text className={d.lsub} x="32" y="411">{t("what.lsub1")}</text>
              <text className={d.lsub} x="32" y="425">{t("what.lsub2")}</text>
              {bars.map((b, i) => (
                <g key={i}>
                  <text className={d.blab} x="32" y={b.y + 8}>{b.lab}</text>
                  <rect className={d.barbg} x="120" y={b.y} width="240" height="9" rx="4.5" />
                  <rect className={d.barfill} x="120" y={b.y} height="9" rx="4.5" width={phase === 3 ? b.w : 0} opacity={b.lead ? 1 : 0.5} />
                  <text className={`${d.bval} ${b.lead ? d.bvalLead : ""}`} x="372" y={b.y + 8} textAnchor="end">{b.val}</text>
                </g>
              ))}
              <line className={d.hair} x1="32" y1="514" x2="398" y2="514" />
              <text className={d.chip} x="32" y="532">{t("what.chipStats")}</text>
              <text className={`${d.chip} ${d.chipDeck}`} x="398" y="532" textAnchor="end">{t("what.chipDeck")}</text>
            </g>
          </svg>
        </div>

        <div className={d.caption}>{t("what.captionA")}<b>{t("what.captionB")}</b>{t("what.captionC")}</div>
      </div>
    </section>
  );
}
