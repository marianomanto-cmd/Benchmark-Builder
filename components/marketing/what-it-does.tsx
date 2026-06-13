import { Reveal } from "@/components/motion/reveal";
import s from "./marketing.module.css";

const RAW = [
  { c: "var(--pf-youtube)", t: "“Vlog Cartagena en 48h con Wingo…”" },
  { c: "var(--pf-reddit)", t: "“¿Vale la pena Bogotá–Cartagena?”" },
  { c: "var(--pf-x)", t: "“Promo a Cartagena desde RD$ 3.999”" },
  { c: "var(--pf-instagram)", t: "“Atardecer en Cartagena ✈️”" },
];

const SCORED = [
  { c: "var(--accent)", t: "Oportunidad · LATAM sin TikTok orgánico" },
  { c: "#6FA8DC", t: "Patrón · picos jueves 11h" },
  { c: "#E0A458", t: "Amenaza · Avianca duplicó spend en Meta" },
  { c: "var(--text-faint)", t: "Sentimiento neto +0,42" },
];

export function WhatItDoes() {
  return (
    <section id="que-hace" className={s.section}>
      <div className={s.container}>
        <Reveal>
          <div className={s.sectionHead}>
            <div className={s.eyebrow}><span className="eyebrow-dot" /> Qué hace</div>
            <h2 className="t-section statement">
              Convierte el ruido de toda tu categoría en <em>una sola lectura</em> que podés presentar.
            </h2>
          </div>
        </Reveal>

        <div className={s.whatGrid}>
          {/* Before/after swap card */}
          <Reveal index={0} as="article">
            <div className={s.whatCard}>
              <div className={s.whatCardLabel}><span className="eyebrow-dot" /> Señales → Análisis</div>
              <span className={s.swapHint}>hover</span>
              <div className={s.whatSwap}>
                <div className={`${s.swapLayer} ${s.swapBefore}`}>
                  {RAW.map((r) => (
                    <div key={r.t} className={s.miniRow}>
                      <span className={s.miniDot} style={{ background: r.c }} /> {r.t}
                    </div>
                  ))}
                </div>
                <div className={`${s.swapLayer} ${s.swapAfter}`}>
                  {SCORED.map((r) => (
                    <div key={r.t} className={s.miniRow}>
                      <span className={s.miniDot} style={{ background: r.c }} /> {r.t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          {/* KPI tile */}
          <Reveal index={1} as="article">
            <div className={s.whatCard}>
              <div className={s.whatCardLabel}><span className="eyebrow-dot" /> Lo que medís</div>
              <div className={s.whatSwap}>
                <div className={s.kpi}>
                  <div>
                    <div className={s.kpiVal}>1.284</div>
                    <div className={s.kpiLbl}>menciones analizadas</div>
                  </div>
                  <div>
                    <div className={s.kpiVal}>9</div>
                    <div className={s.kpiLbl}>fuentes</div>
                  </div>
                </div>
                <div className={s.kpi} style={{ marginTop: 18 }}>
                  <div>
                    <div className={`${s.kpiVal} ${s.kpiUp}`}>41,3%</div>
                    <div className={s.kpiLbl}>share of voice líder</div>
                  </div>
                  <div>
                    <div className={s.kpiVal}>5</div>
                    <div className={s.kpiLbl}>competidores</div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Coverage tile */}
          <Reveal index={2} as="article">
            <div className={s.whatCard}>
              <div className={s.whatCardLabel}><span className="eyebrow-dot" /> Cobertura multi-fuente</div>
              <div className={s.whatSwap}>
                {["Texto · sentimiento y ángulos", "Imagen · creatividades y ads", "Video · frames + voiceover", "Prensa · titulares y alcance"].map((t) => (
                  <div key={t} className={s.miniRow}>
                    <span className={s.miniDot} style={{ background: "var(--accent)" }} /> {t}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
