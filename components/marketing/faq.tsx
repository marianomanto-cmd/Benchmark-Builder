"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Reveal } from "@/components/motion/reveal";
import { useI18n } from "@/components/i18n-provider";
import s from "./marketing.module.css";

const ITEMS = [
  { q: "faq.q1", a: "faq.a1" },
  { q: "faq.q2", a: "faq.a2" },
  { q: "faq.q3", a: "faq.a3" },
  { q: "faq.q4", a: "faq.a4" },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const { t } = useI18n();
  return (
    <section id="faq" className={s.section}>
      <div className={s.container}>
        <Reveal>
          <div className={s.sectionHead}>
            <div className={s.eyebrow}><span className="eyebrow-dot" /> {t("faq.eyebrow")}</div>
            <h2 className="t-section statement">{t("faq.title")}</h2>
          </div>
        </Reveal>

        <div className={s.faq}>
          {ITEMS.map((it, i) => {
            const isOpen = open === i;
            return (
              <div key={it.q} className={s.faqItem}>
                <button className={s.faqQ} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)}>
                  {t(it.q)}
                  <span className="icon">{isOpen ? "—" : "+"}</span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      className={s.faqA}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
                    >
                      <p className={s.faqAInner}>{t(it.a)}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
