"use client";

import { useEffect, useState } from "react";
import { Reveal } from "@/components/motion/reveal";
import { useI18n } from "@/components/i18n-provider";
import { VortexCanvas } from "@/components/marketing/vortex-canvas";
import s from "./marketing.module.css";
import d from "./what-diagram.module.css";

// "Qué hace" — the category's noise spirals into one defensible reading.
// The core content (top insight + top-3 SOV) is illustrative here; in a real run
// it would come from the run's view-model.
const BARS: { lab: string; w: string; lead?: boolean }[] = [
  { lab: "Wingo", w: "100%", lead: true },
  { lab: "Avianca", w: "57%" },
  { lab: "LATAM", w: "48%" },
];

export function WhatItDoes() {
  const { t } = useI18n();
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setFilled(true), 350);
    return () => clearTimeout(id);
  }, []);

  return (
    <section id="que-hace" className={s.section}>
      <div className={s.container}>
        <div className={d.card}>
          <div className={d.grid}>
            <Reveal className={d.lede}>
              <div className={`${s.eyebrow} ${d.eb}`}>{t("what.vEyebrow")}</div>
              <h2 className={d.h3}>{t("what.vTitle")}<br /><em>{t("what.vEm")}</em></h2>
              <p className={d.lp}>{t("what.lead")}</p>
            </Reveal>

            <div className={d.vortex}>
              <VortexCanvas className={d.canvas} />
              <div className={d.core}>
                <div className={d.ct}>{t("what.coreTag")}</div>
                <div className={d.ch}>{t("what.coreHead")}</div>
                {BARS.map((b) => (
                  <div className={d.mbar} key={b.lab}>
                    <span className={d.ml}>{b.lab}</span>
                    <div className={d.mt}>
                      <div className={d.mf} style={{ width: filled ? b.w : 0, opacity: b.lead ? 1 : 0.5 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
