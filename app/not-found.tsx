"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "0 24px",
        gap: 18,
      }}
    >
      <div className="t-eyebrow" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
        <span className="eyebrow-dot" /> {t("nf.eyebrow")}
      </div>
      <h1 className="t-hero" style={{ maxWidth: "16ch" }}>
        {t("nf.title")}
      </h1>
      <p className="t-lead" style={{ maxWidth: "44ch" }}>
        {t("nf.lead")}
      </p>
      <Link
        href="/"
        style={{
          marginTop: 8,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          padding: "12px 20px",
          borderRadius: 999,
          background: "var(--accent)",
          color: "var(--accent-ink)",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        {t("nf.back")}
      </Link>
    </main>
  );
}
