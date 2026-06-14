"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ScreenShell } from "@/components/shell/screen-shell";
import { Btn } from "@/components/ui/primitives";
import { Ic } from "@/components/ui/icons";
import { useI18n } from "@/components/i18n-provider";
import { useSession } from "@/components/session-provider";
import { DEMO_ACCOUNTS, userStats, recentActivity, accountStats } from "@/lib/accounts";

const QUOTES = [1, 2, 3, 4, 5, 6].map((i) => ({ q: `dash.q${i}`, a: `dash.qa${i}` }));
const ease = [0.2, 0.7, 0.3, 1] as const;

export function UserDashboard() {
  const { t, locale } = useI18n();
  const { user } = useSession();
  const stats = userStats();
  const recent = recentActivity(6);
  const firstName = (user?.name ?? "Mariano").split(" ")[0];
  const intl = locale === "en" ? "en-US" : locale === "pt" ? "pt-BR" : "es-AR";

  const kpis = [
    { label: t("dash.kpiAccounts"), value: String(stats.accounts) },
    { label: t("dash.kpiProjects"), value: String(stats.projects) },
    { label: t("dash.kpiRuns"), value: String(stats.runs) },
    { label: t("dash.kpiSpend"), value: `US$${stats.spend.toFixed(2)}` },
    { label: t("dash.kpiMentions"), value: stats.mentions.toLocaleString(intl) },
  ];

  return (
    <ScreenShell breadcrumb={["@nav.dashboard"]} nav="app">
      {/* greeting */}
      <div className="bb-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div>
          <div className="t-micro" style={{ color: "var(--accent)" }}>{t("dash.eyebrow")}</div>
          <h1 className="t-h1" style={{ marginTop: 6, color: "var(--text)" }}>{t("dash.greeting", { name: firstName })}</h1>
          <div className="t-small" style={{ color: "var(--text-muted)", marginTop: 4 }}>{t("dash.subtitle")}</div>
        </div>
        <Link href="/"><Btn kind="accent" size="sm" iconRight={<Ic.bolt s={11} />}>{t("shell.newRun")}</Btn></Link>
      </div>

      {/* inspirational quotes marquee */}
      <div style={{ position: "relative", overflow: "hidden", borderRadius: "var(--r-md)", border: "1px solid var(--border)", background: "color-mix(in srgb, var(--accent) 6%, var(--surface))", padding: "12px 0", marginBottom: 18, WebkitMaskImage: "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)", maskImage: "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)" }}>
        <div className="bb-marquee-track" style={{ display: "flex", gap: 48, width: "max-content", whiteSpace: "nowrap" }}>
          {[...QUOTES, ...QUOTES].map((qq, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "baseline", gap: 8, fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 15, color: "var(--text)" }}>
              <span style={{ color: "var(--accent)" }}>✦</span> “{t(qq.q)}”
              <em style={{ fontStyle: "normal", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>— {t(qq.a)}</em>
            </span>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 22 }}>
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, delay: i * 0.05, ease }} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 16, boxShadow: "var(--sh-1)" }}>
            <div className="t-micro">{k.label}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 600, color: "var(--text)", marginTop: 6 }}>{k.value}</div>
          </motion.div>
        ))}
      </div>

      {/* accounts directory */}
      <div className="t-h3" style={{ color: "var(--text)", marginBottom: 10 }}>{t("dash.accounts")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginBottom: 24 }}>
        {DEMO_ACCOUNTS.map((a, i) => {
          const s = accountStats(a);
          return (
            <motion.div key={a.slug} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, delay: i * 0.04, ease }} className="bb-lift" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 16, boxShadow: "var(--sh-1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
                <span style={{ width: 40, height: 40, borderRadius: 12, background: `color-mix(in srgb, ${a.accent} 22%, transparent)`, color: a.accent, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{a.letter}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                  <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{t(a.industryKey)}</div>
                </div>
                <Link href={`/cuenta/${a.slug}`} style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, color: "var(--accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>{t("dash.open")} <Ic.arrow s={11} /></Link>
              </div>

              {/* projects */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                {a.projects.map((p) => (
                  <Link key={p.slug} href={`/proyecto/${p.slug}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "6px 8px", borderRadius: "var(--r-sm)", textDecoration: "none", color: "var(--text)", background: "var(--surface-2)" }}>
                    <span style={{ fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                    <span style={{ flexShrink: 0, fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{t("dash.runsN", { n: p.runs.length })}</span>
                  </Link>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                <span>{t("dash.projectsN", { n: s.projects })}</span>
                <span>{t("dash.lastRun", { when: s.lastRun })}</span>
                <span>US${s.spend.toFixed(2)}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* recent activity */}
      <div className="t-h3" style={{ color: "var(--text)", marginBottom: 10 }}>{t("dash.recent")}</div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", overflow: "hidden", boxShadow: "var(--sh-1)" }}>
        {recent.map((r, i) => (
          <Link key={`${r.slug}-${r.number}`} href={`/overview?case=${r.slug}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderTop: i ? "1px solid var(--border)" : "none", textDecoration: "none", color: "var(--text)" }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: r.accent, flexShrink: 0 }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", width: 64, flexShrink: 0 }}>#{String(r.number).padStart(3, "0")}</span>
            <span style={{ fontSize: 13, fontWeight: 500, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title ?? r.account}</span>
            <span className="bb-hide-sm" style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{r.account}</span>
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", width: 56, textAlign: "right" }}>{r.mentions} m.</span>
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", width: 64, textAlign: "right" }}>US${r.cost.toFixed(2)}</span>
            <span className="bb-hide-sm" style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-faint)", width: 80, textAlign: "right" }}>{r.when}</span>
          </Link>
        ))}
      </div>
    </ScreenShell>
  );
}
