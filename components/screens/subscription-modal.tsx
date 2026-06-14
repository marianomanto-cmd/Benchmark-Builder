"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Coins, X, Check, Sparkles } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { useSession } from "@/components/session-provider";
import { useCredits } from "@/lib/credits/store";
import { TIERS, REPORT_COST, reportsFor, usdPerReport, type Tier } from "@/lib/credits/config";

// Subscription paywall shown at the end of the wizard when the visitor isn't
// logged in (or is out of credits). All figures come from lib/credits/config —
// nothing here is hardcoded. Picking a tier is a stub: it signs the fake user in,
// loads the plan's credits into their balance and drops them on the dashboard.
export function SubscriptionModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const { signIn } = useSession();
  const { setCredits } = useCredits();

  function choose(tier: Tier) {
    signIn();
    setCredits(tier.credits);
    // TODO: reemplazar por checkout real (Stripe / pago) — por ahora cargamos el saldo directo.
    router.push("/dashboard");
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 95, background: "color-mix(in srgb, #0c0a07 86%, transparent)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "clamp(16px, 5vh, 56px) 16px" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.2, 0.7, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", width: "min(960px, 100%)", background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: 22, boxShadow: "0 40px 100px rgba(0,0,0,0.55)", padding: "clamp(22px, 4vw, 36px)" }}
      >
        <button type="button" onClick={onClose} aria-label={t("sub.close")} style={{ position: "absolute", top: 16, right: 16, width: 34, height: 34, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <X size={16} />
        </button>

        {/* header */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--accent)" }}>
          <Coins size={14} /> Phatia
        </div>
        <h2 className="t-section" style={{ fontSize: "clamp(1.4rem, 3.4vw, 1.95rem)", marginTop: 8, color: "var(--text)" }}>{t("sub.title")}</h2>
        <p style={{ fontSize: 13.5, lineHeight: "20px", color: "var(--text-muted)", marginTop: 8, maxWidth: 620 }}>{t("sub.subtitle", { n: REPORT_COST })}</p>

        {/* tiers */}
        <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 24, alignItems: "stretch" }}>
          {TIERS.map((tier) => (
            <TierCard key={tier.id} tier={tier} onChoose={() => choose(tier)} t={t} />
          ))}
        </div>

        {/* cancel line */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 22, fontSize: 12.5, color: "var(--text-muted)" }}>
          <Check size={14} style={{ color: "var(--success)", flexShrink: 0 }} />
          {t("sub.cancelLine")}
        </div>
      </motion.div>
    </motion.div>
  );
}

function TierCard({ tier, onChoose, t }: { tier: Tier; onChoose: () => void; t: (k: string, v?: Record<string, string | number>) => string }) {
  const [hover, setHover] = useState(false);
  const rec = Boolean(tier.recommended);
  const reports = reportsFor(tier.credits);
  const perReport = usdPerReport(tier);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        padding: "22px 18px 20px",
        borderRadius: 16,
        border: `1px solid ${rec ? "var(--accent)" : "var(--border)"}`,
        background: rec ? "color-mix(in srgb, var(--accent) 9%, var(--surface))" : "var(--surface)",
        boxShadow: rec ? "0 18px 44px color-mix(in srgb, var(--accent) 22%, transparent)" : "var(--sh-1)",
        transform: rec ? "translateY(-6px)" : "none",
      }}
    >
      {rec && (
        <span style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 11px", borderRadius: 999, background: "var(--accent)", color: "var(--accent-ink)", fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
          <Sparkles size={11} /> {t("sub.recommended")}
        </span>
      )}

      <div style={{ fontSize: 14, fontWeight: 700, color: rec ? "var(--accent)" : "var(--text)", letterSpacing: ".02em" }}>{tier.name}</div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 12 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 34, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.02em" }}>US${tier.priceUsd}</span>
        <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{t("sub.perMonth")}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 14, fontSize: 13, color: "var(--text)" }}>
        <Coins size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
        <span style={{ fontWeight: 600 }}>{t("sub.creditsMo", { n: tier.credits.toLocaleString() })}</span>
      </div>

      <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 7, fontSize: 12.5, color: "var(--text-muted)" }}>
        <li style={feat}><Check size={13} style={chk} /> {t("sub.reports", { n: reports })}</li>
        <li style={feat}><Check size={13} style={chk} /> {t("sub.perReport", { v: perReport.toFixed(2) })}</li>
      </ul>

      <div style={{ flex: 1 }} />

      <button
        type="button"
        onClick={onChoose}
        style={{
          marginTop: 20,
          height: 42,
          borderRadius: 999,
          border: rec ? "none" : "1px solid var(--border-strong)",
          background: rec ? "var(--accent)" : hover ? "var(--surface-2)" : "transparent",
          color: rec ? "var(--accent-ink)" : "var(--text)",
          fontSize: 13.5,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "var(--font-sans)",
          transition: "background 140ms ease, filter 140ms ease",
          filter: rec && hover ? "brightness(1.05)" : "none",
        }}
      >
        {t("sub.choose", { name: tier.name })}
      </button>
    </div>
  );
}

const feat: CSSProperties = { display: "flex", alignItems: "center", gap: 7 };
const chk: CSSProperties = { color: "var(--success)", flexShrink: 0 };
