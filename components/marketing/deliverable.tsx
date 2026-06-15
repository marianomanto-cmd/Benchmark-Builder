"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { useI18n } from "@/components/i18n-provider";
import s from "./marketing.module.css";
import d from "./deliverable.module.css";

// "El entregable" — the anatomy of the report (4 sections + page ranges). The
// hero here is the DOCUMENT (not the vortex/process up top). Reveals animate
// only transform (base visible), per the handoff. Background = global site field.
const ease = [0.7, 0.02, 0.2, 1] as const;

type Row = { num: string; nameKey: string; subKey: string; pages: string; preview: ReactNode };

const ROWS: Row[] = [
  {
    num: "01", nameKey: "deliv.r0n", subKey: "deliv.r0s", pages: "p. 1–2",
    preview: (
      <div className={d.prev}>
        {["80%", "96%", "64%"].map((w) => <div key={w} className={d.pl} style={{ width: w }} />)}
      </div>
    ),
  },
  {
    num: "02", nameKey: "deliv.r1n", subKey: "deliv.r1s", pages: "p. 3–8",
    preview: (
      <div className={`${d.prev} ${d.bars}`}>
        {[40, 75, 55, 90, 48].map((h, k) => (
          <motion.i key={k} className={d.barI} style={{ height: `${h}%` }} initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, delay: 0.28 + k * 0.06, ease }} />
        ))}
      </div>
    ),
  },
  {
    num: "03", nameKey: "deliv.r2n", subKey: "deliv.r2s", pages: "p. 9–14",
    preview: (
      <div className={`${d.prev} ${d.grid4}`}>
        {[0, 1, 2, 3].map((k) => <i key={k} className={d.gridI} />)}
      </div>
    ),
  },
  {
    num: "04", nameKey: "deliv.r3n", subKey: "deliv.r3s", pages: "p. 15–18",
    preview: (
      <div className={`${d.prev} ${d.check}`}>
        {["90%", "70%", "80%"].map((w) => <i key={w} className={d.checkI} style={{ width: w }} />)}
      </div>
    ),
  },
];

export function Deliverable() {
  const { t } = useI18n();
  return (
    <section id="reporte" className={s.section}>
      <div className={s.container}>
        <div className={d.grid}>
          <motion.div initial={{ y: 16 }} whileInView={{ y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6, ease }}>
            <div className={`${s.eyebrow} ${d.eyebrow}`}><span className="eyebrow-dot" /> {t("deliv.eyebrow")}</div>
            <h2 className={d.h2}>{t("deliv.h2a")}<br />{t("deliv.h2b")}<em>{t("deliv.h2em")}</em></h2>
            <p className={d.lp}>{t("deliv.leadA")}<b>{t("deliv.leadB")}</b></p>
            <div className={d.chips}>
              <span className={d.ec}><span className={d.ecDot} /> PDF</span>
              <span className={d.ec}><span className={d.ecDot} /> {t("deliv.deck")}</span>
            </div>
          </motion.div>

          <div className={d.anat}>
            <div className={d.ah}>
              <span className={d.ahT}>{t("deliv.cardLabel")} · Q2 2026</span>
              <span className={d.ahDim}>{t("deliv.pages")}</span>
            </div>
            {ROWS.map((r, i) => (
              <motion.div key={r.num} className={d.arow} initial={{ y: 14 }} whileInView={{ y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, delay: 0.05 + i * 0.09, ease }}>
                <div className={d.n}>{r.num}</div>
                <div className={d.nm}>{t(r.nameKey)}<span className={d.sub}>{t(r.subKey)}</span></div>
                {r.preview}
                <div className={d.pgr}>{r.pages}</div>
              </motion.div>
            ))}
            <div className={d.af}>
              <Link href="/reporte" className={d.cta}>{t("deliv.cta")} →</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
