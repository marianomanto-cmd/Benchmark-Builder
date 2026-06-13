"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Reveal } from "@/components/motion/reveal";
import s from "./marketing.module.css";

const ITEMS = [
  { q: "¿De dónde salen los datos?", a: "De fuentes públicas: redes sociales, prensa y bibliotecas de anuncios. Usamos los handles reales de cada competidor y un barrido multi-fuente; nada se inventa." },
  { q: "¿Cuánto cuesta un run?", a: "Lo ves antes de empezar. El asistente estima un rango (bajo–alto) por fuente y por análisis de IA, y el run nunca supera el presupuesto que fijás." },
  { q: "¿Qué analiza la IA?", a: "Texto, imagen, video y voiceover. Detecta sentimiento, ángulos creativos y patrones por competidor, y los resume en takeaways y recomendaciones accionables." },
  { q: "¿Puedo revisar runs anteriores?", a: "Sí. Cada run queda guardado y es revisitable, con su reporte exportable a PDF o presentación." },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className={s.section}>
      <div className={s.container}>
        <Reveal>
          <div className={s.sectionHead}>
            <div className={s.eyebrow}><span className="eyebrow-dot" /> Preguntas</div>
            <h2 className="t-section statement">Lo esencial, sin vueltas.</h2>
          </div>
        </Reveal>

        <div className={s.faq}>
          {ITEMS.map((it, i) => {
            const isOpen = open === i;
            return (
              <div key={it.q} className={s.faqItem}>
                <button className={s.faqQ} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)}>
                  {it.q}
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
                      <p className={s.faqAInner}>{it.a}</p>
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
