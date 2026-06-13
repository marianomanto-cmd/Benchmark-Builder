import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import s from "./marketing.module.css";

export function Deliverable() {
  return (
    <section id="reporte" className={s.section}>
      <div className={s.container}>
        <div className={s.deliverable}>
          <Reveal>
            <div>
              <div className={s.eyebrow}><span className="eyebrow-dot" /> El entregable</div>
              <h2 className="t-section statement" style={{ marginTop: 16 }}>
                El reporte <em>es</em> el producto.
              </h2>
              <p className="t-lead" style={{ marginTop: 18, maxWidth: "44ch" }}>
                Cada run termina en un documento impecable —resumen ejecutivo, comparativa,
                galería de creatividades y recomendaciones— que podés exportar a PDF o
                presentación y llevar a la reunión.
              </p>
              <Link href="/reporte" className={s.cta} style={{ display: "inline-flex", marginTop: 26 }}>
                Ver un ejemplo
              </Link>
            </div>
          </Reveal>

          <Reveal index={1}>
            <div className={s.reportCard}>
              <div className="t-eyebrow">Reporte · Cartagena Q2 2026</div>
              <div className="t-serif" style={{ fontSize: "clamp(1.3rem,3vw,2rem)", lineHeight: 1.1, marginTop: 10, color: "var(--text)" }}>
                Avianca lidera el share, pero cede terreno en TikTok.
              </div>
              <div style={{ marginTop: "auto", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                {[["SOV", "41,3%"], ["Sentimiento", "+0,42"], ["Spend Meta", "↑ 2×"]].map(([k, v]) => (
                  <div key={k} style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{k}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(1.1rem,2.6vw,1.6rem)", color: "var(--text)", marginTop: 4 }}>{v}</div>
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
