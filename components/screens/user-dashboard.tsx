"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Plus, Trash2, X } from "lucide-react";
import { ScreenShell } from "@/components/shell/screen-shell";
import { Btn } from "@/components/ui/primitives";
import { Ic } from "@/components/ui/icons";
import { useI18n } from "@/components/i18n-provider";
import { useSession } from "@/components/session-provider";
import { useDirectory } from "@/lib/directory-store";
import { accountStats, type DirAccount } from "@/lib/accounts";
import type { TFn } from "@/lib/i18n";

const QUOTES = [1, 2, 3, 4, 5, 6].map((i) => ({ q: `dash.q${i}`, a: `dash.qa${i}` }));
const ease = [0.2, 0.7, 0.3, 1] as const;
const inp = { height: 36, padding: "0 11px", borderRadius: "var(--r-sm)", border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", fontSize: 13, fontFamily: "var(--font-sans)", width: "100%" } as const;

export function UserDashboard() {
  const { t, locale } = useI18n();
  const { user } = useSession();
  const { accounts, addAccount, removeAccount, addProject, removeProject } = useDirectory();
  const [creating, setCreating] = useState(false);

  const firstName = (user?.name ?? "Mariano").split(" ")[0];
  const intl = locale === "en" ? "en-US" : locale === "pt" ? "pt-BR" : "es-AR";

  const allRuns = accounts.flatMap((a) => a.projects.flatMap((p) => p.runs));
  const stats = {
    accounts: accounts.length,
    projects: accounts.reduce((s, a) => s + a.projects.length, 0),
    runs: allRuns.length,
    spend: Math.round(allRuns.reduce((s, r) => s + r.cost, 0) * 100) / 100,
    mentions: allRuns.reduce((s, r) => s + r.mentions, 0),
  };
  const recent = accounts
    .flatMap((a) => a.projects.flatMap((p) => p.runs.map((r) => ({ ...r, account: a.name, accent: a.accent }))))
    .sort((x, y) => y.number - x.number)
    .slice(0, 6);

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

      {/* quotes marquee */}
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div className="t-h3" style={{ color: "var(--text)" }}>{t("dash.accounts")}</div>
        <Btn kind="secondary" size="sm" icon={<Plus size={13} />} onClick={() => setCreating((v) => !v)}>{t("dash.newAccount")}</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginBottom: 24 }}>
        {creating && <CreateAccountForm t={t} onCreate={(name, industry) => { addAccount(name, industry); setCreating(false); }} onCancel={() => setCreating(false)} />}
        {accounts.map((a, i) => (
          <AccountCard
            key={a.slug}
            account={a}
            index={i}
            t={t}
            onDeleteAccount={() => { if (window.confirm(t("dash.confirmAccount", { name: a.name }))) removeAccount(a.slug); }}
            onAddProject={(name) => addProject(a.slug, name)}
            onDeleteProject={(p) => { if (window.confirm(t("dash.confirmProject", { name: p.name }))) removeProject(a.slug, p.slug); }}
          />
        ))}
      </div>

      {/* recent activity */}
      <div className="t-h3" style={{ color: "var(--text)", marginBottom: 10 }}>{t("dash.recent")}</div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", overflow: "hidden", boxShadow: "var(--sh-1)" }}>
        {recent.length === 0 && <div style={{ padding: "16px", fontSize: 13, color: "var(--text-muted)" }}>—</div>}
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

function CreateAccountForm({ t, onCreate, onCancel }: { t: TFn; onCreate: (name: string, industry: string) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--accent)", borderRadius: "var(--r-md)", padding: 16, boxShadow: "var(--sh-1)", display: "flex", flexDirection: "column", gap: 8 }}>
      <input autoFocus style={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("dash.accountName")} onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onCreate(name, industry); }} />
      <input style={inp} value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder={t("dash.industry")} onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onCreate(name, industry); }} />
      <div style={{ display: "flex", gap: 8 }}>
        <Btn kind="accent" size="sm" disabled={!name.trim()} onClick={() => name.trim() && onCreate(name, industry)}>{t("dash.create")}</Btn>
        <Btn kind="ghost" size="sm" onClick={onCancel}>{t("dash.cancel")}</Btn>
      </div>
    </div>
  );
}

function AccountCard({ account: a, index, t, onDeleteAccount, onAddProject, onDeleteProject }: { account: DirAccount; index: number; t: TFn; onDeleteAccount: () => void; onAddProject: (name: string) => void; onDeleteProject: (p: { slug: string; name: string }) => void }) {
  const s = accountStats(a);
  const [adding, setAdding] = useState(false);
  const [pname, setPname] = useState("");
  const submit = () => { if (pname.trim()) { onAddProject(pname); setPname(""); setAdding(false); } };
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, delay: index * 0.04, ease }} className="bb-lift" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 16, boxShadow: "var(--sh-1)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
        <span style={{ width: 40, height: 40, borderRadius: 12, background: `color-mix(in srgb, ${a.accent} 22%, transparent)`, color: a.accent, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{a.letter}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{t(a.industryKey)}</div>
        </div>
        <Link href={`/cuenta/${a.slug}`} style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, color: "var(--accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>{t("dash.open")} <Ic.arrow s={11} /></Link>
        <button type="button" onClick={onDeleteAccount} aria-label={t("dash.delete")} title={t("dash.delete")} style={{ flexShrink: 0, border: "none", background: "transparent", color: "var(--text-faint)", cursor: "pointer", display: "inline-flex", padding: 2 }}><Trash2 size={14} /></button>
      </div>

      {/* projects */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
        {a.projects.length === 0 && !adding && <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "2px 0" }}>{t("dash.emptyProjects")}</div>}
        {a.projects.map((p) => (
          <div key={p.slug} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", borderRadius: "var(--r-sm)", background: "var(--surface-2)" }}>
            <Link href={`/proyecto/${p.slug}`} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, textDecoration: "none", color: "var(--text)" }}>
              <span style={{ fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
              <span style={{ flexShrink: 0, fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{t("dash.runsN", { n: p.runs.length })}</span>
            </Link>
            <button type="button" onClick={() => onDeleteProject(p)} aria-label={t("dash.delete")} style={{ flexShrink: 0, border: "none", background: "transparent", color: "var(--text-faint)", cursor: "pointer", display: "inline-flex", padding: 0 }}><X size={13} /></button>
          </div>
        ))}
        {adding ? (
          <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
            <input autoFocus style={{ ...inp, height: 32, fontSize: 12.5 }} value={pname} onChange={(e) => setPname(e.target.value)} placeholder={t("dash.projectName")} onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setAdding(false); setPname(""); } }} />
            <Btn kind="accent" size="sm" disabled={!pname.trim()} onClick={submit}>{t("dash.create")}</Btn>
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)} style={{ alignSelf: "flex-start", marginTop: 2, border: "none", background: "transparent", color: "var(--accent)", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5, padding: 0 }}><Plus size={12} /> {t("dash.newProject")}</button>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
        <span>{t("dash.projectsN", { n: s.projects })}</span>
        <span>{t("dash.runsN", { n: s.runs })}</span>
        <span>US${s.spend.toFixed(2)}</span>
      </div>
    </motion.div>
  );
}
