"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Folder } from "lucide-react";
import { ScreenShell } from "@/components/shell/screen-shell";
import { Btn } from "@/components/ui/primitives";
import { Ic } from "@/components/ui/icons";
import { useI18n } from "@/components/i18n-provider";
import { accountStats, projectStats, type DirAccount } from "@/lib/accounts";

const ease = [0.2, 0.7, 0.3, 1] as const;

export function AccountView({ account }: { account: DirAccount }) {
  const { t } = useI18n();
  const s = accountStats(account);

  return (
    <ScreenShell breadcrumb={["@nav.dashboard", account.name]} nav="app">
      {/* header */}
      <div className="bb-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <span style={{ width: 52, height: 52, borderRadius: 14, background: `color-mix(in srgb, ${account.accent} 22%, transparent)`, color: account.accent, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 22, flexShrink: 0 }}>{account.letter}</span>
          <div style={{ minWidth: 0 }}>
            <div className="t-micro" style={{ color: "var(--accent)" }}>{t("acct.eyebrow")}</div>
            <h1 className="t-h1" style={{ color: "var(--text)", marginTop: 2 }}>{account.name}</h1>
            <div className="t-small" style={{ color: "var(--text-muted)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
              {t(account.industryKey)} · {t("dash.projectsN", { n: s.projects })} · {t("dash.runsN", { n: s.runs })} · US${s.spend.toFixed(2)}
            </div>
          </div>
        </div>
        <Link href="/"><Btn kind="accent" size="sm" iconRight={<Ic.bolt s={11} />}>{t("shell.newRun")}</Btn></Link>
      </div>

      {/* projects */}
      <div className="t-h3" style={{ color: "var(--text)", marginBottom: 10 }}>{t("shell.nav.projects")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {account.projects.map((p, i) => {
          const ps = projectStats(p);
          return (
            <motion.div key={p.slug} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, delay: i * 0.05, ease }}>
              <Link href={`/proyecto/${p.slug}`} className="bb-lift" style={{ textDecoration: "none", color: "inherit", display: "block", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 16, boxShadow: "var(--sh-1)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <span style={{ width: 38, height: 38, borderRadius: "var(--r-sm)", background: `color-mix(in srgb, ${account.accent} 22%, transparent)`, color: account.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Folder size={18} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{t("dash.lastRun", { when: ps.lastRun })}</div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                  <span>{t("dash.runsN", { n: ps.runs })}</span>
                  <span>{ps.mentions} m.</span>
                  <span>cap US${p.budget}</span>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </ScreenShell>
  );
}
