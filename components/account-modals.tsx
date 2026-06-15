"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { motion } from "motion/react";
import { X, Plus } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { useDirectory } from "@/lib/directory-store";

const SWATCHES = ["#d23b2e", "#e8893b", "#2a6f5b", "#3a3540", "#ff5a3c", "#9a6b3b"];
const IND_KEYS = ["dash.ind.airline", "dash.ind.beauty", "dash.ind.fashion", "dash.ind.fintech", "dash.ind.sportswear", "dash.ind.coffee"];
const ease = [0.7, 0.02, 0.2, 1] as const;

function ModalShell({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "rgba(6,5,10,.66)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", overflowY: "auto" }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 14, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease }}
        style={{ width: "min(440px, 100%)", border: "1px solid var(--border-strong)", borderRadius: 20, background: "var(--surface)", boxShadow: "0 14px 38px rgba(0,0,0,0.52)", overflow: "hidden" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 21, fontWeight: 500, color: "var(--text)" }}>{title}</h3>
          <button type="button" onClick={onClose} aria-label="✕" style={{ width: 30, height: 30, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-muted)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={14} /></button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 15 }}>{children}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 20px", borderTop: "1px solid var(--border)" }}>{footer}</div>
      </motion.div>
    </motion.div>
  );
}

function ModalField({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</span>
      {children}
    </label>
  );
}

const ctl: CSSProperties = { height: 40, border: "1px solid var(--border-strong)", borderRadius: "var(--r-sm)", background: "var(--surface-2)", color: "var(--text)", padding: "0 12px", fontFamily: "var(--font-sans)", fontSize: 14, outline: "none", width: "100%" };
function btn(primary: boolean, disabled = false): CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 16px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, fontFamily: "var(--font-sans)", border: primary ? "none" : "1px solid var(--border-strong)", background: primary ? "var(--accent)" : "transparent", color: primary ? "var(--accent-ink)" : "var(--text)" };
}

export function NewAccountModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { addAccount } = useDirectory();
  const [name, setName] = useState("");
  const [ind, setInd] = useState(t(IND_KEYS[0]));
  const [color, setColor] = useState(SWATCHES[0]);
  const submit = () => { if (!name.trim()) return; addAccount(name, ind, color); onClose(); };
  return (
    <ModalShell
      title={t("panel.naTitle")}
      onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} style={btn(false)}>{t("dash.cancel")}</button>
        <button type="button" onClick={submit} disabled={!name.trim()} style={btn(true, !name.trim())}><Plus size={14} /> {t("panel.naCreate")}</button>
      </>}
    >
      <ModalField label={t("panel.naName")}>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} placeholder={t("panel.naNamePh")} style={ctl} />
      </ModalField>
      <ModalField label={t("panel.naIndustry")}>
        <select value={ind} onChange={(e) => setInd(e.target.value)} style={ctl}>
          {IND_KEYS.map((k) => <option key={k} value={t(k)}>{t(k)}</option>)}
          <option value={t("panel.indOther")}>{t("panel.indOther")}</option>
        </select>
      </ModalField>
      <ModalField label={t("panel.naColor")}>
        <div style={{ display: "flex", gap: 8 }}>
          {SWATCHES.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)} aria-label={c} style={{ width: 30, height: 30, borderRadius: 8, cursor: "pointer", background: c, border: "2px solid transparent", boxShadow: color === c ? "0 0 0 2px var(--surface), 0 0 0 4px var(--text)" : "none" }} />
          ))}
        </div>
      </ModalField>
    </ModalShell>
  );
}

export function NewProjectModal({ onClose, preselectedSlug }: { onClose: () => void; preselectedSlug?: string }) {
  const { t } = useI18n();
  const { accounts, addProject } = useDirectory();
  const [acctSlug, setAcctSlug] = useState(preselectedSlug || accounts[0]?.slug || "");
  const [name, setName] = useState("");
  const [comp, setComp] = useState(""); // collected for UX; not persisted in the demo store
  const submit = () => { if (!name.trim() || !acctSlug) return; addProject(acctSlug, name); onClose(); };
  return (
    <ModalShell
      title={t("panel.npTitle")}
      onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} style={btn(false)}>{t("dash.cancel")}</button>
        <button type="button" onClick={submit} disabled={!name.trim()} style={btn(true, !name.trim())}><Plus size={14} /> {t("panel.npCreate")}</button>
      </>}
    >
      <ModalField label={t("panel.npAccount")}>
        <select value={acctSlug} onChange={(e) => setAcctSlug(e.target.value)} style={ctl}>
          {accounts.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}
        </select>
      </ModalField>
      <ModalField label={t("panel.npName")}>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} placeholder={t("panel.npNamePh")} style={ctl} />
      </ModalField>
      <ModalField label={<>{t("panel.npComp")} <span style={{ color: "var(--text-faint)", textTransform: "none", letterSpacing: 0 }}>{t("panel.npCompOpt")}</span></>}>
        <input value={comp} onChange={(e) => setComp(e.target.value)} placeholder={t("panel.npCompPh")} style={ctl} />
      </ModalField>
    </ModalShell>
  );
}
