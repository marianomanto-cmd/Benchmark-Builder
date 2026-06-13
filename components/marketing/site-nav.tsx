"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import s from "./marketing.module.css";

const LINKS = [
  { href: "#que-hace", label: "Producto" },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#reporte", label: "Reportes" },
  { href: "#faq", label: "FAQ" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className={s.nav}>
      <div className={`${s.container} ${s.navInner}`}>
        <Link href="/" className={s.logo}>
          <span className={s.logoDot} /> Benchmark <span>· Builder</span>
        </Link>
        <nav className={s.menu} aria-label="Principal">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className={s.menuLink}>{l.label}</a>
          ))}
        </nav>
        <div className={s.navRight}>
          <ThemeToggle />
          <Link href="/research-plan" className={`${s.cta} ${s.navCtaDesktop}`}>Generar reporte</Link>
          <button
            type="button"
            className={s.navToggle}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {open && (
        <div className={s.mobileMenu}>
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>
          ))}
          <Link href="/research-plan" onClick={() => setOpen(false)}>Generar reporte →</Link>
        </div>
      )}
    </header>
  );
}
