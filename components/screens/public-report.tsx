"use client";

import { Printer } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ReportDocView } from "@/components/report-doc-view";
import type { ReportDoc } from "@/lib/report-doc";
import { DEFAULT_BRANDING, type Branding } from "@/lib/branding";

// Read-only public share view (/r/[token]). No app shell. Minimal toolbar
// (Descargar PDF), the shared <ReportDocView> on the white sheet, recolored +
// relabeled by the agency's white-label branding (Phatia by default).
export function PublicReport({ doc, branding }: { doc: ReportDoc; branding?: Branding }) {
  const b = branding ?? DEFAULT_BRANDING;
  return (
    <div style={{ minHeight: "100dvh", background: "var(--surface-2)", display: "flex", flexDirection: "column", alignItems: "center", padding: "clamp(10px, 3vw, 28px)" }}>
      <div className="bb-noprint" style={{ width: "min(900px, 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: "clamp(10px, 2vw, 16px)" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--text-muted)", textDecoration: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.logoUrl} alt="" width={22} height={22} className="bb-logo" style={{ borderRadius: "50%", objectFit: "cover", display: "block" }} /> {b.brandName}
        </Link>
        <button type="button" onClick={() => window.print()} style={tbtn}><Printer size={15} /> Descargar PDF</button>
      </div>

      <article className="bb-print" style={{ width: "min(900px, 100%)", background: "#fff", boxShadow: "var(--sh-4)", borderRadius: 6, padding: "clamp(26px, 6vw, 76px)", fontFamily: "var(--font-serif)", color: "var(--n900)", "--sa-base": b.accentHex, "--accent": b.accentHex } as CSSProperties}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", paddingBottom: 14, borderBottom: "1px solid var(--n200)", marginBottom: "clamp(18px, 4vw, 30px)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--n500)" }}>
            <span style={{ width: 5, height: 18, background: "var(--sa-base)", display: "inline-block", borderRadius: 1 }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.logoUrl} alt="" width={18} height={18} style={{ borderRadius: "50%", objectFit: "cover", display: "block" }} /> {b.brandName} · reporte compartido
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--n400)", letterSpacing: ".06em", textTransform: "uppercase" }}>solo lectura</span>
        </header>

        <ReportDocView doc={doc} accent={b.accentHex} />

        {!b.hidePhatiaFooter && (
          <footer style={{ marginTop: "clamp(28px, 5vw, 44px)", paddingTop: 14, borderTop: "1px solid var(--n200)", fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--n400)", letterSpacing: ".06em", textTransform: "uppercase" }}>
            Generado con Phatia
          </footer>
        )}
      </article>
    </div>
  );
}

const tbtn: CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, height: 38, padding: "0 16px", borderRadius: 999,
  fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none",
  background: "var(--accent)", color: "var(--accent-ink)",
};
