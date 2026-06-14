"use client";

import { Reveal } from "@/components/motion/reveal";
import { useI18n } from "@/components/i18n-provider";
import s from "./marketing.module.css";
import c from "./testimonials.module.css";

// Fictional clients (demo "social proof"). LinkedIn links are placeholders.
const PEOPLE = [
  { name: "Camila Restrepo", company: "Bavaria", img: 47, li: "camila-restrepo", role: "testi.r1", quote: "testi.c1" },
  { name: "Tomás Iglesias", company: "Mercado Libre", img: 12, li: "tomas-iglesias", role: "testi.r2", quote: "testi.c2" },
  { name: "Valentina Souza", company: "Natura", img: 32, li: "valentina-souza", role: "testi.r3", quote: "testi.c3" },
  { name: "Diego Salinas", company: "Rappi", img: 15, li: "diego-salinas", role: "testi.r4", quote: "testi.c4" },
  { name: "Lucía Fernández", company: "Grupo Aval", img: 45, li: "lucia-fernandez", role: "testi.r5", quote: "testi.c5" },
  { name: "Andrés Mejía", company: "Claro", img: 33, li: "andres-mejia", role: "testi.r6", quote: "testi.c6" },
];

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.2 8h4.6v14H.2V8zm7.4 0h4.4v1.9h.06c.61-1.16 2.1-2.4 4.34-2.4 4.64 0 5.5 3.05 5.5 7.02V22h-4.6v-6.2c0-1.48-.03-3.38-2.06-3.38-2.06 0-2.38 1.6-2.38 3.27V22H7.6V8z" />
    </svg>
  );
}

export function Testimonials() {
  const { t } = useI18n();
  const items = [...PEOPLE, ...PEOPLE];
  return (
    <section id="testimonios" className={s.section}>
      <div className={s.container}>
        <Reveal>
          <div className={s.sectionHead}>
            <div className={s.eyebrow}><span className="eyebrow-dot" /> {t("testi.eyebrow")}</div>
            <h2 className="t-section statement">{t("testi.title")}</h2>
          </div>
        </Reveal>
      </div>
      <div className={c.marquee} aria-label={t("testi.eyebrow")}>
        <div className={c.track}>
          {items.map((p, i) => (
            <article key={i} className={c.card}>
              <div className={c.head}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={c.avatar} src={`https://i.pravatar.cc/120?img=${p.img}`} alt={p.name} width={44} height={44} loading="lazy" />
                <div style={{ minWidth: 0 }}>
                  <div className={c.name}>{p.name}</div>
                  <div className={c.role}>{t(p.role)} · {p.company}</div>
                </div>
                <a className={c.li} href={`https://www.linkedin.com/in/${p.li}`} target="_blank" rel="noopener noreferrer" aria-label={`LinkedIn · ${p.name}`}>
                  <LinkedInIcon />
                </a>
              </div>
              <div className={c.stars} aria-hidden>★★★★★</div>
              <p className={c.quote}>“{t(p.quote)}”</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
