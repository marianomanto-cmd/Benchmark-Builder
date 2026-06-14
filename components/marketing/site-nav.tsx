"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSelect } from "@/components/language-select";
import { useI18n } from "@/components/i18n-provider";
import s from "./marketing.module.css";

const LINKS = [
  { href: "#que-hace", key: "nav.product" },
  { href: "#como-funciona", key: "nav.how" },
  { href: "#reporte", key: "nav.reports" },
  { href: "#faq", key: "nav.faq" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  return (
    <header className={s.nav}>
      <div className={`${s.container} ${s.navInner}`}>
        <Link href="/" className={s.logo}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.jpg" alt="Phema" width={26} height={26} className="bb-logo" style={{ borderRadius: "50%", objectFit: "cover", display: "block" }} /> Phema
        </Link>
        <nav className={s.menu} aria-label="Principal">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className={s.menuLink}>{t(l.key)}</a>
          ))}
        </nav>
        <div className={s.navRight}>
          <LanguageSelect compact />
          <ThemeToggle />
          <Link href="/research-plan" className={`${s.cta} ${s.navCtaDesktop}`}>{t("common.generateReport")}</Link>
          <button
            type="button"
            className={s.navToggle}
            aria-label={open ? t("common.closeMenu") : t("common.openMenu")}
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
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{t(l.key)}</a>
          ))}
          <Link href="/research-plan" onClick={() => setOpen(false)}>{t("common.generateReport")} →</Link>
        </div>
      )}
    </header>
  );
}
