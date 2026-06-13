import { Reveal } from "@/components/motion/reveal";
import s from "./marketing.module.css";

const STEPS = [
  { code: "(MR)", n: "01", title: "Definí el marco", body: "Problema de negocio, competidores con filtros por magnitud, alcance y fechas." },
  { code: "(DS)", n: "02", title: "Descubrimos y scrapeamos", body: "Handles reales y multi-fuente: redes, prensa y anuncios, en un solo barrido." },
  { code: "(✦)", n: "03", title: "Análisis + insights", body: "Texto, imagen, video y voiceover; sentimiento, ángulos y patrones por competidor." },
  { code: "(RX)", n: "04", title: "Reporte exportable", body: "El entregable que se vende —PDF y presentación— listo en un clic." },
];

export function Process() {
  return (
    <section id="como-funciona" className={s.section}>
      <div className={s.container}>
        <Reveal>
          <div className={s.sectionHead}>
            <div className={s.eyebrow}><span className="eyebrow-dot" /> Cómo funciona</div>
            <h2 className="t-section statement">Una secuencia real, de la pregunta al reporte.</h2>
          </div>
        </Reveal>

        <div className={s.process}>
          {STEPS.map((st, i) => (
            <Reveal key={st.n} index={i}>
              <div className={s.step}>
                <div className={s.stepNum}>{st.n}</div>
                <div>
                  <div className={s.stepLabel}>{st.code} · paso {st.n}</div>
                  <div className={s.stepTitle}>{st.title}</div>
                  <p className={s.stepBody}>{st.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
