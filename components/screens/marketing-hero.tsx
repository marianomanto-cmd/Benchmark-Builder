"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { HomeWizard } from "@/components/screens/home-wizard";
import { Onboarding } from "@/components/screens/onboarding";
import { SignInModal } from "@/components/sign-in-modal";
import { useI18n } from "@/components/i18n-provider";
import s from "@/components/marketing/marketing.module.css";

const EASE = [0.2, 0.7, 0.2, 1] as const;

// Logged-out hero: hooks + CTA (no prompt box). The CTA opens the wizard for the
// first report; finishing it creates the account (session) and enters the app.
export function MarketingHero() {
  const { t } = useI18n();
  const [wizard, setWizard] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [signin, setSignin] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = setTimeout(() => setReady(true), reduced ? 0 : 150);
    return () => clearTimeout(id);
  }, []);

  // Camera "push-in": while the onboarding scene or the wizard is open, scale the
  // persistent global background video toward its center via a CSS var on <html>
  // (SiteBackground reads it) — without remounting the video. Skipped on reduced
  // motion. The scene & wizard are translucent, so the video stays visible.
  const scene = onboarding || wizard;
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = document.documentElement;
    el.style.setProperty("--site-cam-scale", scene && !reduced ? "1.05" : "1");
    return () => { el.style.setProperty("--site-cam-scale", "1"); };
  }, [scene]);

  const rise = (d: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 },
    transition: { duration: 0.5, delay: d, ease: EASE },
  });

  return (
    <>
      <section className={s.hero}>
        {/* Hero content recedes (lifts + fades) when the cinematic scene opens, so
            the translucent scene reveals the background video — it isn't covered. */}
        <motion.div
          className={`${s.container} ${s.heroInner}`}
          animate={{ opacity: scene ? 0 : 1, y: scene ? -26 : 0, scale: scene ? 0.985 : 1 }}
          transition={{ duration: 0.5, ease: EASE }}
          style={{ pointerEvents: scene ? "none" : "auto" }}
        >
          <motion.div {...rise(0.05)} className={s.eyebrow}><span className="eyebrow-dot" /> {t("hero.eyebrow")}</motion.div>
          <motion.h1 {...rise(0.12)} className="t-hero" style={{ marginTop: 18, maxWidth: "18ch" }}>
            {t("home.hookA")} <em style={{ fontStyle: "italic", color: "var(--accent)" }}>{t("home.hookEm")}</em>
          </motion.h1>
          <motion.p {...rise(0.2)} className="t-lead" style={{ marginTop: 20, maxWidth: "54ch" }}>{t("home.hookLead")}</motion.p>
          <motion.div {...rise(0.3)} style={{ marginTop: 30, display: "flex", alignItems: "center", justifyContent: "center", gap: 18, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setOnboarding(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 10, height: 54, padding: "0 26px", borderRadius: 999, border: "none", background: "var(--accent)", color: "var(--accent-ink)", fontSize: 16, fontWeight: 600, cursor: "pointer", boxShadow: "0 14px 34px color-mix(in srgb, var(--accent) 40%, transparent)" }}
            >
              {t("home.cta")} <ArrowRight size={18} />
            </button>
            <div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("home.ctaSub")}</div>
              <button type="button" onClick={() => setSignin(true)} style={{ marginTop: 2, border: "none", background: "transparent", color: "var(--accent)", fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 0 }}>{t("home.haveAccount")} →</button>
            </div>
          </motion.div>
        </motion.div>
      </section>
      <AnimatePresence>
        {onboarding && <Onboarding key="onb" onFinish={() => { setOnboarding(false); setWizard(true); }} onCancel={() => setOnboarding(false)} />}
        {wizard && <HomeWizard initialQuery="" onClose={() => setWizard(false)} />}
        {signin && <SignInModal onClose={() => setSignin(false)} />}
      </AnimatePresence>
    </>
  );
}
