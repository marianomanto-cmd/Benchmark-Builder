"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Folder, Plus, Trash2, X } from "lucide-react";
import { ScreenShell } from "@/components/shell/screen-shell";
import { Btn } from "@/components/ui/primitives";
import { AccountAvatar } from "@/components/account-avatar";
import { useI18n } from "@/components/i18n-provider";
import { useDirectory, findAccount } from "@/lib/directory-store";
import { accountStats, projectStats } from "@/lib/accounts";

const ease = [0.2, 0.7, 0.3, 1] as const;
const inp = { height: 34, padding: "0 11px", borderRadius: "var(--r-sm)", border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", fontSize: 13, fontFamily: "var(--font-sans)", flex: 1 } as const;

export function AccountView({ slug }: { slug: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const { accounts, addProject, removeProject, removeAccount } = useDirectory();
  const account = findAccount(accounts, slug);
  const [adding, setAdding] = useState(false);
  const [pname, setPname] = useState("");

  if (!account) {
    return (
      <ScreenShell breadcrumb={["@nav.dashboard"]} nav="app">
        <div style={{ padding: "48px 16px", textAlign: "center", color: "var(--text-muted)" }}>{t("dash.notFound")}</div>
      </ScreenShell>
    );
  }

  const s = accountStats(account);
  const submit = () => { if (pname.trim()) { addProject(account.slug, pname); setPname(""); setAdding(false); } };

  return (
    <ScreenShell breadcrumb={["@nav.dashboard", account.name]} nav="app">
      <div className="bb-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <AccountAvatar slug={account.slug} name={account.name} letter={account.letter} accent={account.accent} size={52} radius={14} />
          <div style={{ minWidth: 0 }}>
            <div className="t-micro" style={{ color: "var(--accent)" }}>{t("acct.eyebrow")}</div>
            <h1 className="t-h1" style={{ color: "var(--text)", marginTop: 2 }}>{account.name}</h1>
            <div className="t-small" style={{ color: "var(--text-muted)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
              {t(account.industryKey)} · {t("dash.projectsN", { n: s.projects })} · {t("dash.runsN", { n: s.runs })} · US${s.spend.toFixed(2)}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn kind="secondary" size="sm" icon={<Plus size={13} />} onClick={() => setAdding((v) => !v)}>{t("dash.newProject")}</Btn>
          <Btn kind="ghost" size="sm" icon={<Trash2 size={12} />} onClick={() => { if (window.confirm(t("dash.confirmAccount", { name: account.name }))) { removeAccount(account.slug); router.push("/dashboard"); } }}>{t("dash.delete")}</Btn>
        </div>
      </div>

      <div className="t-h3" style={{ color: "var(--text)", marginBottom: 10 }}>{t("shell.nav.projects")}</div>

      {adding && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, maxWidth: 460 }}>
          <input autoFocus style={inp} value={pname} onChange={(e) => setPname(e.target.value)} placeholder={t("dash.projectName")} onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setAdding(false); setPname(""); } }} />
          <Btn kind="accent" size="sm" disabled={!pname.trim()} onClick={submit}>{t("dash.create")}</Btn>
          <Btn kind="ghost" size="sm" onClick={() => { setAdding(false); setPname(""); }}>{t("dash.cancel")}</Btn>
        </div>
      )}

      {account.projects.length === 0 && !adding && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("dash.emptyProjects")}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {account.projects.map((p, i) => {
          const ps = projectStats(p);
          return (
            <motion.div key={p.slug} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, delay: i * 0.05, ease }} className="bb-lift" style={{ position: "relative", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 16, boxShadow: "var(--sh-1)" }}>
              <button type="button" onClick={() => { if (window.confirm(t("dash.confirmProject", { name: p.name }))) removeProject(account.slug, p.slug); }} aria-label={t("dash.delete")} style={{ position: "absolute", top: 10, right: 10, border: "none", background: "transparent", color: "var(--text-faint)", cursor: "pointer", display: "inline-flex", padding: 2, zIndex: 2 }}><X size={14} /></button>
              <Link href={`/proyecto/${p.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingRight: 18 }}>
                  <span style={{ width: 38, height: 38, borderRadius: "var(--r-sm)", background: `color-mix(in srgb, ${account.accent} 22%, transparent)`, color: account.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Folder size={18} /></span>
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
