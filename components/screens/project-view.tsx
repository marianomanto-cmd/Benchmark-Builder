"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ScreenShell } from "@/components/shell/screen-shell";
import { Btn, BBBadge } from "@/components/ui/primitives";
import { Ic } from "@/components/ui/icons";
import { useI18n } from "@/components/i18n-provider";
import { useDirectory, findProject } from "@/lib/directory-store";
import { projectStats } from "@/lib/accounts";

const ease = [0.2, 0.7, 0.3, 1] as const;

export function ProjectView({ slug }: { slug: string }) {
  const { t } = useI18n();
  const { accounts } = useDirectory();
  const found = findProject(accounts, slug);

  if (!found) {
    return (
      <ScreenShell breadcrumb={["@nav.dashboard"]} nav="app">
        <div style={{ padding: "48px 16px", textAlign: "center", color: "var(--text-muted)" }}>{t("dash.notFound")}</div>
      </ScreenShell>
    );
  }

  const { account, project } = found;
  const s = projectStats(project);

  return (
    <ScreenShell breadcrumb={["@nav.dashboard", account.name, project.name]} nav="app">
      <div className="bb-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ minWidth: 0 }}>
          <div className="t-micro" style={{ color: "var(--accent)" }}>{t("proj.eyebrow")} · {account.name}</div>
          <h1 className="t-h1" style={{ color: "var(--text)", marginTop: 4 }}>{project.name}</h1>
          <div className="t-small" style={{ color: "var(--text-muted)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
            {t("dash.runsN", { n: s.runs })} · {s.mentions} m. · US${s.spend.toFixed(2)} · cap US${project.budget}
          </div>
        </div>
        <Link href="/"><Btn kind="accent" size="sm" iconRight={<Ic.bolt s={11} />}>{t("shell.newRun")}</Btn></Link>
      </div>

      <div className="t-h3" style={{ color: "var(--text)", marginBottom: 10 }}>{t("proj.runs")}</div>
      {project.runs.length === 0 && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("proj.empty")}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
        {project.runs.map((r, i) => (
          <motion.div key={r.number} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, delay: i * 0.05, ease }}>
            <Link
              href={`/overview?case=${r.slug}`}
              className="bb-lift"
              style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", gap: 10, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 16, boxShadow: "var(--sh-1)" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text)", fontWeight: 500 }}>run #{String(r.number).padStart(3, "0")}</span>
                <BBBadge tone="success" size="sm">done</BBBadge>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{r.title ?? project.name}</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                <span>{r.when}</span>
                <span>{r.mentions} m.</span>
                <span>US${r.cost.toFixed(2)}</span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </ScreenShell>
  );
}
