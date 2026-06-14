"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import s from "./marketing.module.css";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className={s.footer}>
      <div className={s.container}>
        <div className={s.footerBig}>
          <Link href="/research-plan">{t("footer.cta")}</Link>
        </div>
        <div className={s.footerRow}>
          <div className={s.footerLinks}>
            <a href="#que-hace">{t("nav.product")}</a>
            <a href="#como-funciona">{t("nav.how")}</a>
            <a href="#reporte">{t("nav.reports")}</a>
            <a href="#faq">{t("nav.faq")}</a>
            <Link href="/overview">{t("common.demo")}</Link>
          </div>
          <div className={s.footerMeta}>{t("footer.meta")}</div>
        </div>
      </div>
    </footer>
  );
}
