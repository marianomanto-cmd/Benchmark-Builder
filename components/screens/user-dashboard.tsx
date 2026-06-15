"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Plus, Search, FileText } from "lucide-react";
import { ScreenShell } from "@/components/shell/screen-shell";
import { AccountAvatar } from "@/components/account-avatar";
import { NewAccountModal, NewProjectModal } from "@/components/account-modals";
import { useI18n } from "@/components/i18n-provider";
import { useCredits } from "@/lib/credits/store";
import { useDirectory } from "@/lib/directory-store";
import { accountStats, accountColor } from "@/lib/accounts";

const ease = [0.7, 0.02, 0.2, 1] as const;
const runId = (n: number) => `#${String(n).padStart(3, "0")}`;
const SPARK_A = [40, 55, 45, 70, 60, 85];
const SPARK_B = [30, 50, 40, 65, 55, 80];

export function UserDashboard() {
  const { t, locale } = useI18n();
  const { balance } = useCredits();
  const { accounts } = useDirectory();
  const router = useRouter();
  const [modal, setModal] = useState<null | { kind: "account" } | { kind: "project"; slug?: string }>(null);

  const intl = locale === "en" ? "en-US" : locale === "pt" ? "pt-BR" : "es-AR";
  const runsFlat = accounts
    .flatMap((a) => a.projects.flatMap((p) => p.runs.map((r) => ({ ...r, account: a.name, accountSlug: a.slug, color: accountColor(a.slug, a.accent) }))))
    .sort((x, y) => y.number - x.number);
  const totals = {
    runs: runsFlat.length,
    mentions: runsFlat.reduce((s, r) => s + r.mentions, 0),
    accounts: accounts.length,
    projects: accounts.reduce((s, a) => s + a.projects.length, 0),
  };
  const last = runsFlat[0];

  const kpis: { label: string; value: string; accent?: boolean; spark?: number[] }[] = [
    { label: t("dash.kpiCredits"), value: balance.toLocaleString(intl), accent: true, spark: SPARK_A },
    { label: t("dash.kpiRuns"), value: String(totals.runs), spark: SPARK_B },
    { label: t("dash.kpiMentions"), value: totals.mentions.toLocaleString(intl) },
    { label: t("panel.kAccountsProj"), value: `${totals.accounts} · ${totals.projects}` },
  ];

  return (
    <ScreenShell breadcrumb={["@nav.dashboard"]} nav="app">
      <div style={{ marginBottom: 18 }}>
        <div style={eyebrow}><span style={dot} /> {t("panel.eyebrow")}</div>
      </div>

      {/* hero: resume last run + KPIs */}
      <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20, marginBottom: 20, alignItems: "stretch" }}>
        <motion.div initial={{ y: 14 }} animate={{ y: 0 }} transition={{ duration: 0.5, ease }} style={resume}>
          <div aria-hidden style={glow} />
          {last ? (
            <>
              <div style={{ position: "relative" }}>
                <div style={{ ...eyebrow, color: "var(--accent)" }}><span style={dot} /> {t("panel.resumeEb")} · {last.when}</div>
                <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: "clamp(22px, 2.6vw, 30px)", letterSpacing: "-0.02em", margin: "14px 0 4px", color: "var(--text)" }}>
                  {t("panel.resumePre")}<em style={{ fontStyle: "italic", color: "var(--accent)" }}>{last.title ?? last.account}</em>
                </h2>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>{t("panel.runline", { id: runId(last.number), acc: last.account, menc: last.mentions })}</div>
              </div>
              <div style={{ position: "relative", display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap", alignItems: "center" }}>
                <Link href={`/overview?case=${last.slug}`} style={cta(true)}>{t("panel.openReport")} →</Link>
                <Link href={`/swot?case=${last.slug}`} style={cta(false)}>{t("panel.viewFoda")}</Link>
                <Link href={`/cuenta/${last.accountSlug}`} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", textDecoration: "none", marginLeft: 2 }}>
                  <AccountAvatar slug={last.accountSlug} name={last.account} letter={last.account[0]} accent={last.color} size={20} radius={5} /> {last.account}
                </Link>
              </div>
            </>
          ) : (
            <div style={{ position: "relative" }}>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 26, color: "var(--text)", marginBottom: 14 }}>{t("dash.greeting", { name: "" })}</h2>
              <button type="button" onClick={() => router.push("/")} style={cta(true)}><Plus size={14} /> {t("shell.newRun")}</button>
            </div>
          )}
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {kpis.map((k, i) => (
            <motion.div key={k.label} initial={{ y: 12 }} animate={{ y: 0 }} transition={{ duration: 0.5, delay: i * 0.05, ease }} style={kc(k.accent)}>
              <div style={kLabel}>{k.label}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 500, marginTop: 8, color: k.accent ? "var(--accent)" : "var(--text)" }}>{k.value}</div>
              {k.spark && (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 22, marginTop: 8 }}>
                  {k.spark.map((h, j) => <span key={j} style={{ flex: 1, height: `${h}%`, background: "color-mix(in srgb, var(--viz-accent) 65%, transparent)", borderRadius: 1.5 }} />)}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* shortcuts */}
      <motion.div initial={{ y: 12 }} animate={{ y: 0 }} transition={{ duration: 0.45, ease }} className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <Shortcut prim icon={<Plus size={17} />} title={t("shell.newRun")} sub={t("panel.scNewRunSub")} onClick={() => router.push("/")} />
        <Shortcut icon={<Plus size={17} />} title={t("dash.newAccount")} sub={t("panel.scNewAcctSub")} onClick={() => setModal({ kind: "account" })} />
        <Shortcut icon={<FileText size={16} />} title={t("dash.newProject")} sub={t("panel.scNewProjSub")} onClick={() => setModal({ kind: "project" })} />
        <Shortcut icon={<Search size={16} />} title={t("panel.scSearch")} sub={t("panel.scSearchSub")} onClick={() => window.dispatchEvent(new Event("bb:command"))} />
      </motion.div>

      {/* activity + accounts */}
      <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 22, alignItems: "start" }}>
        <section>
          <div style={secLbl}><span style={secT}>{t("panel.activity")}</span><Link href="/runs" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", textDecoration: "none" }}>{t("common.viewAll")}</Link></div>
          <div style={panelBox}>
            {runsFlat.slice(0, 6).map((r, i) => (
              <Link key={`${r.accountSlug}-${r.number}`} href={`/overview?case=${r.slug}`} style={{ ...tlRow, borderTop: i ? "1px solid var(--border)" : "none" }} className="bb-tl">
                <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: r.color }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-faint)" }}>{runId(r.number)}</span>
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 500, letterSpacing: "-0.01em", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title ?? r.account}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-muted)" }}>{r.account} · {t("panel.mentionsN", { n: r.mentions })}</span>
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-faint)", whiteSpace: "nowrap", textAlign: "right" }}>{r.when}</span>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div style={secLbl}><span style={secT}>{t("panel.quickAccounts")}</span></div>
          <div style={panelBox}>
            {accounts.map((a, i) => {
              const st = accountStats(a);
              const color = accountColor(a.slug, a.accent);
              const empty = st.runs === 0;
              return empty ? (
                <button key={a.slug} type="button" onClick={() => setModal({ kind: "project", slug: a.slug })} style={{ ...qaRow, borderTop: i ? "1px solid var(--border)" : "none", background: "color-mix(in srgb, var(--accent) 5%, transparent)", border: "none", width: "100%", textAlign: "left", cursor: "pointer" }}>
                  <AccountAvatar slug={a.slug} name={a.name} letter={a.letter} accent={color} size={30} radius={7} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                    <span style={qaInd}>{t("panel.qaNew")}</span>
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)" }}>{t("panel.qaNewRun")}</span>
                </button>
              ) : (
                <Link key={a.slug} href={`/cuenta/${a.slug}`} style={{ ...qaRow, borderTop: i ? "1px solid var(--border)" : "none" }} className="bb-qa">
                  <AccountAvatar slug={a.slug} name={a.name} letter={a.letter} accent={color} size={30} radius={7} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                    <span style={qaInd}>{t(a.industryKey)} · {t("dash.runsN", { n: st.runs })}</span>
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-faint)" }}>{t("panel.open")} →</span>
                </Link>
              );
            })}
            <div style={{ padding: "10px 11px", borderTop: "1px solid var(--border)" }}>
              <button type="button" onClick={() => setModal({ kind: "account" })} style={{ ...cta(false), width: "100%", justifyContent: "center", height: 30, color: "var(--accent)", borderColor: "var(--border-strong)" }}><Plus size={13} /> {t("dash.newAccount")}</button>
            </div>
          </div>
        </section>
      </div>

      {modal?.kind === "account" && <NewAccountModal onClose={() => setModal(null)} />}
      {modal?.kind === "project" && <NewProjectModal preselectedSlug={modal.slug} onClose={() => setModal(null)} />}
    </ScreenShell>
  );
}

function Shortcut({ icon, title, sub, onClick, prim }: { icon: ReactNode; title: string; sub: string; onClick: () => void; prim?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="bb-lift" style={{ display: "flex", alignItems: "center", gap: 11, border: "1px solid var(--border)", borderRadius: "var(--r-md)", background: "color-mix(in srgb, var(--surface) 60%, transparent)", padding: "13px 15px", textAlign: "left", cursor: "pointer" }}>
      <span style={{ width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: prim ? "var(--accent)" : "var(--surface-2)", color: prim ? "var(--accent-ink)" : "var(--viz-accent)", border: prim ? "none" : "1px solid var(--border)" }}>{icon}</span>
      <span>
        <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{title}</span>
        <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", marginTop: 2 }}>{sub}</span>
      </span>
    </button>
  );
}

const eyebrow: CSSProperties = { fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 9 };
const dot: CSSProperties = { width: 7, height: 7, borderRadius: "50%", background: "var(--accent)" };
const resume: CSSProperties = { position: "relative", border: "1px solid var(--border-strong)", borderRadius: 20, overflow: "hidden", padding: "24px 26px", background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 16%, var(--surface)), var(--surface) 62%)", boxShadow: "0 14px 38px rgba(0,0,0,0.52)", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 210 };
const glow: CSSProperties = { position: "absolute", inset: "auto -40px -60px auto", width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 30%, transparent), transparent 70%)", pointerEvents: "none" };
const kLabel: CSSProperties = { fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-muted)" };
function kc(accent?: boolean): CSSProperties {
  return { border: `1px solid ${accent ? "color-mix(in srgb, var(--accent) 30%, var(--border))" : "var(--border)"}`, borderRadius: "var(--r-md)", background: accent ? "linear-gradient(135deg, color-mix(in srgb, var(--accent) 14%, var(--surface)), var(--surface))" : "color-mix(in srgb, var(--surface) 70%, transparent)", padding: "14px 15px", display: "flex", flexDirection: "column", justifyContent: "space-between" };
}
const secLbl: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 12px" };
const secT: CSSProperties = { fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--text-muted)" };
const panelBox: CSSProperties = { border: "1px solid var(--border)", borderRadius: "var(--r-lg)", background: "color-mix(in srgb, var(--surface) 70%, transparent)", padding: 6, boxShadow: "var(--sh-1)" };
const tlRow: CSSProperties = { display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 13, alignItems: "center", padding: "12px", borderRadius: "var(--r-sm)", textDecoration: "none", color: "inherit" };
const qaRow: CSSProperties = { display: "grid", gridTemplateColumns: "30px 1fr auto", gap: 11, alignItems: "center", padding: "10px 11px", borderRadius: "var(--r-sm)", textDecoration: "none", color: "inherit" };
const qaInd: CSSProperties = { fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".04em", marginTop: 1, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
function cta(primary: boolean): CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 7, height: 36, padding: "0 15px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none", fontFamily: "var(--font-sans)", border: primary ? "none" : "1px solid var(--border-strong)", background: primary ? "var(--accent)" : "transparent", color: primary ? "var(--accent-ink)" : "var(--text)", boxShadow: primary ? "0 8px 22px color-mix(in srgb, var(--accent) 32%, transparent)" : "none" };
}
