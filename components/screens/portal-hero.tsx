"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles, ArrowRight } from "lucide-react";
import { HomeWizard } from "@/components/screens/home-wizard";
import { useI18n } from "@/components/i18n-provider";
import s from "@/components/marketing/marketing.module.css";

export type RunSummary = { number: number; mentions: number; cost: number; when: string; title?: string; slug?: string };

const EX_KEYS = ["hero.ex0", "hero.ex1", "hero.ex2", "hero.ex3", "hero.ex4"];

const EASE = [0.2, 0.7, 0.2, 1] as const;

export function PortalHero({ runs }: { runs: RunSummary[] }) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [ph, setPh] = useState(0);
  const [focused, setFocused] = useState(false);
  const [wizardQuery, setWizardQuery] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // No curtain: on load you see the (global) video; after a beat — "when we
  // submerge" — the tagline + box rise in. Immediate under reduced motion.
  const [phase, setPhase] = useState<"intro" | "ready">("intro");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setPhase("ready"), reduced ? 0 : 2500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setPh((i) => (i + 1) % EX_KEYS.length), 2800);
    return () => clearInterval(id);
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
      <div className={`${s.container} ${s.heroInner}`}>
        <motion.div {...rise(0.05)} className={s.eyebrow}>
          <span className="eyebrow-dot" /> {t("hero.eyebrow")}
        </motion.div>

        <motion.h1 {...rise(0.12)} className="t-hero" style={{ marginTop: 18, maxWidth: "16ch" }}>
          {t("hero.titleBefore")}<em style={{ fontStyle: "italic", color: "var(--accent)" }}>{t("hero.titleEm")}</em>{t("hero.titleAfter")}
        </motion.h1>

        <motion.p {...rise(0.2)} className="t-lead" style={{ marginTop: 20, maxWidth: "52ch" }}>
          {t("hero.lead")}
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
              placeholder={t("hero.placeholder", { ex: t(EX_KEYS[ph]) })}
              aria-label={t("hero.aria")}
            />
            <button type="submit" className={s.boxBtn} aria-label={t("hero.start")}>
              <ArrowRight size={18} />
            </button>
          </div>

          <div className={s.chips}>
            {EX_KEYS.slice(0, 3).map((k) => (
              <button key={k} type="button" className={s.chip} onClick={() => { setQ(t(k)); inputRef.current?.focus(); }}>
                {t(k)}
              </button>
            ))}
          </div>
        </motion.form>

        {runs.length > 0 && (
          <motion.div {...rise(0.44)} className={s.runs}>
            <div className={s.runsHead}>
              <div className="t-eyebrow">{t("hero.recentRuns")}</div>
              <Link href="/runs" className={s.runsLink}>{t("common.viewAll")}</Link>
            </div>
            <div className={s.runsGrid}>
              {runs.slice(0, 3).map((r) => (
                <Link key={r.number} href={`/overview${r.slug ? `?case=${r.slug}` : ""}`} className={s.runCard}>
                  <div className={s.runNo}>run #{String(r.number).padStart(3, "0")}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{r.title ?? t("hero.investigation")}</div>
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
