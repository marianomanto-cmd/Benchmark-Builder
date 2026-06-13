import Link from "next/link";
import s from "./marketing.module.css";

export function SiteFooter() {
  return (
    <footer className={s.footer}>
      <div className={s.container}>
        <div className={s.footerBig}>
          <Link href="/research-plan">Generá tu reporte →</Link>
        </div>
        <div className={s.footerRow}>
          <div className={s.footerLinks}>
            <a href="#que-hace">Producto</a>
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#reporte">Reportes</a>
            <a href="#faq">FAQ</a>
            <Link href="/overview">Demo</Link>
          </div>
          <div className={s.footerMeta}>Benchmark Builder · Inteligencia de marca, presentable.</div>
        </div>
      </div>
    </footer>
  );
}
