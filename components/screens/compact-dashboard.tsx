"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import { DEMO_ACCOUNTS, accountStats } from "@/lib/accounts";
import s from "@/components/marketing/marketing.module.css";

// Compact accounts view shown under the hero on the logged-in home.
export function CompactDashboard() {
  const { t } = useI18n();
  const accounts = DEMO_ACCOUNTS.slice(0, 4);
  return (
    <section className={s.section} style={{ paddingTop: 0 }}>
      <div className={s.container}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16, gap: 12 }}>
          <div className={s.eyebrow}><span className="eyebrow-dot" /> {t("home.yourAccounts")}</div>
          <Link href="/dashboard" style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}>{t("common.viewAll")}</Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {accounts.map((a) => {
            const st = accountStats(a);
            return (
              <Link key={a.slug} href={`/cuenta/${a.slug}`} className="bb-lift" style={{ textDecoration: "none", color: "inherit", display: "block", background: "color-mix(in srgb, var(--surface) 70%, transparent)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 16, boxShadow: "var(--sh-1)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 11, background: `color-mix(in srgb, ${a.accent} 22%, transparent)`, color: a.accent, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{a.letter}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                    <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{t(a.industryKey)}</div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                  <span>{t("dash.runsN", { n: st.runs })}</span>
                  <span>US${st.spend.toFixed(2)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
