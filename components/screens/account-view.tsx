"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { ScreenShell } from "@/components/shell/screen-shell";
import { AccountAvatar } from "@/components/account-avatar";
import { NewProjectModal } from "@/components/account-modals";
import { useI18n } from "@/components/i18n-provider";
import { useDirectory, findAccount } from "@/lib/directory-store";
import { accountStats, accountColor } from "@/lib/accounts";

const ease = [0.7, 0.02, 0.2, 1] as const;
const runId = (n: number) => `#${String(n).padStart(3, "0")}`;

export function AccountView({ slug }: { slug: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const { accounts, removeAccount, removeProject } = useDirectory();
  const account = findAccount(accounts, slug);
  const [showProj, setShowProj] = useState(false);

  if (!account) {
    return (
      <ScreenShell breadcrumb={["@nav.dashboard"]} nav="app">
        <div style={{ padding: "48px 16px", textAlign: "center", color: "var(--text-muted)" }}>{t("dash.notFound")}</div>
      </ScreenShell>
    );
  }

  const st = accountStats(account);
  const color = accountColor(account.slug, account.accent);

  return (
    <ScreenShell breadcrumb={["@nav.dashboard", account.name]} nav="app">
      <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", textDecoration: "none", marginBottom: 16 }}>
        <ChevronLeft size={15} /> {t("panel.backToPanel")}
      </Link>

      {/* account hero */}
      <motion.div
        initial={{ y: 14 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="bb-row"
        style={{ position: "relative", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 20, alignItems: "center", padding: 24, border: "1px solid var(--border-strong)", borderRadius: 20, background: `linear-gradient(135deg, color-mix(in srgb, ${color} 16%, var(--surface)), var(--surface) 62%)`, boxShadow: "0 14px 38px rgba(0,0,0,0.52)", marginBottom: 26 }}
      >
        <AccountAvatar slug={account.slug} name={account.name} letter={account.letter} accent={color} size={64} radius={16} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: color }} /> {t(account.industryKey)}
          </div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: "clamp(26px, 3.4vw, 38px)", letterSpacing: "-0.02em", margin: "7px 0 12px", color: "var(--text)" }}>{account.name}</h1>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <Stat n={st.projects} label={t("dash.projectsN", { n: "" }).trim()} />
            <Stat n={st.runs} label="runs" />
            <Stat n={st.mentions} label={t("panel.mentionsN", { n: "" }).trim()} />
          </div>
        </div>
        <div className="bb-row" style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <button type="button" onClick={() => setShowProj(true)} style={cta(true)}><Plus size={14} /> {t("dash.newProject")}</button>
          <button type="button" onClick={() => router.push("/")} style={cta(false)}><Plus size={14} /> {t("shell.newRun")}</button>
        </div>
        <button
          type="button"
          onClick={() => { if (window.confirm(t("dash.confirmAccount", { name: account.name }))) { removeAccount(account.slug); router.push("/dashboard"); } }}
          aria-label={t("dash.delete")}
          title={t("dash.delete")}
          style={{ position: "absolute", top: 12, right: 12, width: 28, height: 28, borderRadius: 7, border: "1px solid transparent", background: "transparent", color: "var(--text-faint)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
        ><Trash2 size={14} /></button>
      </motion.div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 12px" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--text-muted)" }}>{t("panel.projectsOf")}</span>
      </div>

      {account.projects.map((p) => (
        <div key={p.slug} style={{ border: "1px solid var(--border)", borderRadius: "var(--r-lg)", background: "color-mix(in srgb, var(--surface) 70%, transparent)", padding: "16px 18px", marginBottom: 14, boxShadow: "var(--sh-1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 13 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: "var(--viz-accent)" }} />
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--text)" }}>{p.name}</span>
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-faint)" }}>{t("dash.runsN", { n: p.runs.length })}</span>
            <button type="button" onClick={() => { if (window.confirm(t("dash.confirmProject", { name: p.name }))) removeProject(account.slug, p.slug); }} aria-label={t("dash.delete")} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid transparent", background: "transparent", color: "var(--text-faint)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={14} /></button>
          </div>
          {p.runs.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", padding: "2px 2px 4px" }}>{t("proj.empty")}</div>
          ) : (
            p.runs.map((r) => (
              <Link key={r.number} href={`/overview?case=${r.slug}`} className="bb-runrow" style={{ display: "grid", gridTemplateColumns: "54px 1fr auto auto", gap: 14, alignItems: "center", padding: "11px 13px", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", background: "var(--surface-2)", textDecoration: "none", color: "inherit", marginTop: 8 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text)", fontWeight: 500 }}>{runId(r.number)}</span>
                <span style={{ fontSize: 13, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title ?? account.name}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-faint)", whiteSpace: "nowrap" }}>{t("panel.mentionsN", { n: r.mentions })}</span>
                <span className="bb-hide-sm" style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-faint)", whiteSpace: "nowrap", textAlign: "right" }}>{r.when}</span>
              </Link>
            ))
          )}
        </div>
      ))}

      {account.projects.length === 0 && <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>{t("dash.emptyProjects")}</div>}

      <button type="button" onClick={() => setShowProj(true)} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: "9px 2px 2px", fontFamily: "var(--font-sans)" }}>
        <Plus size={13} /> {t("panel.newProjectHere")}
      </button>

      {showProj && <NewProjectModal preselectedSlug={account.slug} onClose={() => setShowProj(false)} />}
    </ScreenShell>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
      <b style={{ color: "var(--text)", fontWeight: 500, fontSize: 15, marginRight: 2 }}>{n}</b> {label}
    </span>
  );
}

function cta(primary: boolean): CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 7, height: 36, padding: "0 15px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", whiteSpace: "nowrap", border: primary ? "none" : "1px solid var(--border-strong)", background: primary ? "var(--accent)" : "transparent", color: primary ? "var(--accent-ink)" : "var(--text)", boxShadow: primary ? "0 8px 22px color-mix(in srgb, var(--accent) 32%, transparent)" : "none" };
}
