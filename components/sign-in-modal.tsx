"use client";

import { useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import { X, Lock } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { useSession } from "@/components/session-provider";
import { checkCredentials } from "@/lib/session";

// Credential-gated sign-in window. Email/password validate against the single
// demo account; Google/Microsoft are present but stubbed (wired later).
export function SignInModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { login } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [soon, setSoon] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (checkCredentials(email, password)) {
      login(); // sets the session + redirects to /dashboard
      onClose();
    } else {
      setError(true);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 95, background: "color-mix(in srgb, #0c0a07 86%, transparent)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", overflowY: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(16px, 5vh, 56px) 16px" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.2, 0.7, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", width: "min(420px, 100%)", background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: 20, boxShadow: "0 40px 100px rgba(0,0,0,0.55)", padding: "clamp(22px, 4vw, 32px)" }}
      >
        <button type="button" onClick={onClose} aria-label={t("auth.close")} style={{ position: "absolute", top: 14, right: 14, width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <X size={15} />
        </button>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.jpg" alt="" width={26} height={26} className="bb-logo" style={{ borderRadius: "50%", objectFit: "cover", display: "block" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--text-muted)" }}>Phatia</span>
        </div>

        <h2 className="t-h2" style={{ color: "var(--text)", fontSize: 22, marginBottom: 6 }}>{t("auth.title")}</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 20px", lineHeight: 1.5 }}>{t("auth.subtitle")}</p>

        {/* OAuth (stubbed) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <button type="button" onClick={() => setSoon(true)} style={oauthBtn}>
            <GoogleIcon /> {t("auth.google")}
          </button>
          <button type="button" onClick={() => setSoon(true)} style={oauthBtn}>
            <MicrosoftIcon /> {t("auth.microsoft")}
          </button>
        </div>
        {soon && <div style={{ marginTop: 10, fontSize: 11.5, fontFamily: "var(--font-mono)", color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 6 }}><Lock size={11} /> {t("auth.soon")}</div>}

        {/* divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
          <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: ".1em" }}>{t("auth.or")}</span>
          <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        {/* email + password */}
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "block" }}>
            <span style={lbl}>{t("auth.email")}</span>
            <input type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(false); }} placeholder={t("auth.emailPh")} style={inp} />
          </label>
          <label style={{ display: "block" }}>
            <span style={lbl}>{t("auth.password")}</span>
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setError(false); }} placeholder={t("auth.passwordPh")} style={inp} />
          </label>
          {error && <div style={{ fontSize: 12.5, color: "var(--danger)" }}>{t("auth.error")}</div>}
          <button type="submit" style={{ marginTop: 4, height: 46, borderRadius: 12, border: "none", background: "var(--accent)", color: "var(--accent-ink)", fontSize: 14.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
            {t("auth.submit")}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden style={{ flexShrink: 0 }}>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 23 23" aria-hidden style={{ flexShrink: 0 }}>
      <rect x="1" y="1" width="10" height="10" fill="#f25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7fba00" />
      <rect x="1" y="12" width="10" height="10" fill="#00a4ef" />
      <rect x="12" y="12" width="10" height="10" fill="#ffb900" />
    </svg>
  );
}

const oauthBtn: CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
  height: 46, borderRadius: 12, border: "1px solid var(--border-strong)", background: "var(--surface-2)",
  color: "var(--text)", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-sans)",
};
const lbl: CSSProperties = { display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 };
const inp: CSSProperties = { width: "100%", height: 44, padding: "0 13px", borderRadius: 10, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", fontSize: 14, fontFamily: "var(--font-sans)", outline: "none" };
