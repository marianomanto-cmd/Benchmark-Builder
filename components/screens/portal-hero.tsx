"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles, ArrowRight, Wand2, Compass } from "lucide-react";
import { HeroCanvas } from "@/components/marketing/hero-canvas";
import { HomeWizard } from "@/components/screens/home-wizard";
import s from "@/components/marketing/marketing.module.css";

export type RunSummary = { number: number; mentions: number; cost: number; when: string; title?: string };

const EXAMPLES = [
  "una nueva ruta a Cartagena",
  "las tarifas que publicita Avianca",
  "el lanzamiento de clase ejecutiva",
  "qué se dice en X sobre los retrasos",
  "el contenido orgánico vs pago de la competencia",
];

const EASE = [0.2, 0.7, 0.2, 1] as const;

export function PortalHero({ runs }: { runs: RunSummary[] }) {
  const [q, setQ] = useState("");
  const [ph, setPh] = useState(0);
  const [focused, setFocused] = useState(false);
  const [wizardQuery, setWizardQuery] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Intro curtain: starts covering the hero (default "intro") so there's no
  // flash of the box; the particle field drifts behind the tagline, a counter
  // runs, then the curtain rises to reveal the box. Skipped under reduced motion.
  const [phase, setPhase] = useState<"intro" | "ready">("intro");
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase("ready");
      return;
    }
    const startedAt = performance.now();
    const DUR = 2600;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - startedAt) / DUR, 1);
      setPct(Math.round((1 - Math.pow(1 - p, 3)) * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
      else finish();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  function finish() {
    setPhase("ready");
  }

  useEffect(() => {
    const t = setInterval(() => setPh((i) => (i + 1) % EXAMPLES.length), 2800);
    return () => clearInterval(t);
  }, []);

  // The wizard lives ON the home: opening it shows the step-by-step frame inline
  // (brand → markets → competitors → scope → discards → dates → cost) until the
  // user approves. No routing to a separate page.
  function go(query: string, _mode?: string) {
    setWizardQuery(query.trim());
  }

  const ready = phase === "ready";
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 },
    transition: { duration: 0.7, delay, ease: EASE },
  });

  return (
    <>
    <section className={s.hero}>
      <HeroCanvas className={s.heroCanvas} />

      <AnimatePresence>
        {phase === "intro" && (
          <motion.div
            className={s.intro}
            role="button"
            tabIndex={0}
            aria-label="Saltar intro"
            onClick={finish}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && finish()}
            initial={{ opacity: 1, y: 0 }}
            exit={{ y: "-100%", transition: { duration: 0.85, ease: EASE } }}
          >
            <motion.h1
              className="t-hero"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
            >
              De mil señales, <em style={{ fontStyle: "italic", color: "var(--accent)" }}>una sola lectura.</em>
            </motion.h1>
            <div className={s.introCounter}>
              Analizando — <b>{pct}%</b>
            </div>
            <span className={s.introSkip}>tocá para saltar</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`${s.container} ${s.heroInner}`}>
        <motion.div {...rise(0.05)} className={s.eyebrow}>
          <span className="eyebrow-dot" /> Inteligencia competitiva · Social listening
        </motion.div>

        <motion.h1 {...rise(0.12)} className="t-hero" style={{ marginTop: 18, maxWidth: "16ch" }}>
          ¿Qué querés investigar <em style={{ fontStyle: "italic", color: "var(--accent)" }}>hoy</em>?
        </motion.h1>

        <motion.p {...rise(0.2)} className="t-lead" style={{ marginTop: 20, maxWidth: "52ch" }}>
          Describí tu pregunta de negocio. Armamos el marco, estimamos el costo y la IA produce un reporte que se vende.
        </motion.p>

        <motion.form {...rise(0.28)} className={s.box} onSubmit={(e) => { e.preventDefault(); go(q); }}>
          <div className={s.boxField} data-focused={focused}>
            <Sparkles size={18} style={{ color: "var(--accent)", flexShrink: 0 }} />
            <input
              ref={inputRef}
              className={s.boxInput}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={`Ej: ${EXAMPLES[ph]}…`}
              aria-label="¿Qué querés investigar hoy?"
            />
            <button type="submit" className={s.boxBtn} aria-label="Empezar investigación">
              <ArrowRight size={18} />
            </button>
          </div>

          <div className={s.chips}>
            {EXAMPLES.slice(0, 3).map((ex) => (
              <button key={ex} type="button" className={s.chip} onClick={() => { setQ(ex); inputRef.current?.focus(); }}>
                {ex}
              </button>
            ))}
          </div>
        </motion.form>

        <motion.div {...rise(0.36)} className={s.actions}>
          <button type="button" className={s.actionBtn} onClick={() => go("", "guided")}>
            <Wand2 size={15} style={{ color: "var(--accent)" }} /> Análisis guiado
          </button>
          <button type="button" className={s.actionBtn} onClick={() => go("", "general")}>
            <Compass size={15} style={{ color: "var(--accent)" }} /> Análisis general
          </button>
        </motion.div>

        {runs.length > 0 && (
          <motion.div {...rise(0.44)} className={s.runs}>
            <div className={s.runsHead}>
              <div className="t-eyebrow">Runs recientes</div>
              <Link href="/runs" className={s.runsLink}>Ver todos →</Link>
            </div>
            <div className={s.runsGrid}>
              {runs.slice(0, 3).map((r) => (
                <Link key={r.number} href="/overview" className={s.runCard}>
                  <div className={s.runNo}>run #{String(r.number).padStart(3, "0")}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{r.title ?? "Investigación"}</div>
                  <div className={s.runMeta}>
                    <span>{r.when}</span>
                    <span>USD {r.cost.toFixed(2)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </section>
    <AnimatePresence>
      {wizardQuery !== null && <HomeWizard initialQuery={wizardQuery} onClose={() => setWizardQuery(null)} />}
    </AnimatePresence>
    </>
  );
}
