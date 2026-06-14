"use client";

import { Reveal } from "@/components/motion/reveal";
import { useI18n } from "@/components/i18n-provider";
import s from "./marketing.module.css";

const STEPS = [
  { code: "(MR)", n: "01", t: "process.s1t", b: "process.s1b" },
  { code: "(DS)", n: "02", t: "process.s2t", b: "process.s2b" },
  { code: "(✦)", n: "03", t: "process.s3t", b: "process.s3b" },
  { code: "(RX)", n: "04", t: "process.s4t", b: "process.s4b" },
];

export function Process() {
  const { t } = useI18n();
  return (
    <section id="como-funciona" className={s.section}>
      <div className={s.container}>
        <Reveal>
          <div className={s.sectionHead}>
            <div className={s.eyebrow}><span className="eyebrow-dot" /> {t("process.eyebrow")}</div>
            <h2 className="t-section statement">{t("process.title")}</h2>
          </div>
        </Reveal>

        <div className={s.process}>
          {STEPS.map((st, i) => (
            <Reveal key={st.n} index={i}>
              <div className={s.step}>
                <div className={s.stepNum}>{st.n}</div>
                <div>
                  <div className={s.stepLabel}>{st.code} · {t("process.step")} {st.n}</div>
                  <div className={s.stepTitle}>{t(st.t)}</div>
                  <p className={s.stepBody}>{t(st.b)}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
