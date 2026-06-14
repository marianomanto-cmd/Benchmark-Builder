"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSelect } from "@/components/language-select";
import { useI18n } from "@/components/i18n-provider";
import { useSession } from "@/components/session-provider";
import { UserMenu } from "@/components/user-menu";
import { SignInModal } from "@/components/sign-in-modal";
import s from "./marketing.module.css";

const LINKS = [
  { href: "#que-hace", key: "nav.product" },
  { href: "#como-funciona", key: "nav.how" },
  { href: "#reporte", key: "nav.reports" },
  { href: "#faq", key: "nav.faq" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [signin, setSignin] = useState(false);
  const { t } = useI18n();
  const { user } = useSession();
  return (
    <header className={s.nav}>
      <div className={`${s.container} ${s.navInner}`}>
        <Link href="/" className={s.logo}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.jpg" alt="Phatia" width={26} height={26} className="bb-logo" style={{ borderRadius: "50%", objectFit: "cover", display: "block" }} /> Phatia
        </Link>
        {!user && (
          <nav className={s.menu} aria-label="Principal">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className={s.menuLink}>{t(l.key)}</a>
            ))}
          </nav>
        )}
        <div className={s.navRight}>
          <LanguageSelect compact />
          <ThemeToggle />
          {user ? (
            <>
              <Link href="/dashboard" className={`${s.cta} ${s.navCtaDesktop}`}>{t("nav.dashboard")}</Link>
              <UserMenu />
            </>
          ) : (
            <button type="button" onClick={() => setSignin(true)} className={`${s.cta} ${s.navCtaDesktop}`}>{t("nav.signin")}</button>
          )}
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
          {!user && LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{t(l.key)}</a>
          ))}
          {user ? (
            <Link href="/dashboard" onClick={() => setOpen(false)}>{t("nav.dashboard")} →</Link>
          ) : (
            <button type="button" onClick={() => { setOpen(false); setSignin(true); }} style={{ textAlign: "left", border: "none", background: "transparent", color: "inherit", font: "inherit", cursor: "pointer", padding: 0 }}>{t("nav.signin")} →</button>
          )}
        </div>
      )}
      {signin && <SignInModal onClose={() => setSignin(false)} />}
    </header>
  );
}
