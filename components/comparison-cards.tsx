"use client";

import type { CSSProperties, ReactNode } from "react";
import { PlatformBadge } from "@/components/domain";
import { SentimentChip } from "@/components/ui/primitives";
import type { CompCol, CompRow } from "@/lib/demo-cases";
import type { PlatformKey, SentimentKind } from "@/lib/platforms";

// Mobile-first comparison: one card per competitor with metrics as label/value
// rows — the "no tablas en mobile" contract (HANDOFF). Reuses the same data the
// desktop comparison table consumes (cols + rows), so there's no duplicate logic.
// `tone="paper"` renders on the always-white report sheet (n-scale), `tone="app"`
// (default) uses the theme tokens for the in-app screens.
type Tone = "app" | "paper";

export function ComparisonCards({ cols, rows, platsByCol, tone = "app" }: { cols: CompCol[]; rows: CompRow[]; platsByCol?: PlatformKey[][]; tone?: Tone }) {
  const p =
    tone === "paper"
      ? { text: "var(--n900)", muted: "var(--n500)", border: "var(--n200)", card: "#fff", clientCard: "color-mix(in srgb, var(--sa-base) 7%, #fff)", clientBorder: "var(--sa-base)", clientText: "var(--sa-base)" }
      : { text: "var(--text)", muted: "var(--text-muted)", border: "var(--border)", card: "var(--surface)", clientCard: "var(--accent-soft)", clientBorder: "var(--accent)", clientText: "var(--accent)" };
  const mono: CSSProperties = { fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 500, color: p.text };

  function valueFor(r: CompRow, j: number): ReactNode {
    const v = r.vals[j];
    if (r.fmt === "sent") return <SentimentChip kind={v as SentimentKind} />;
    if (r.fmt === "plats") {
      const ps = platsByCol?.[j];
      if (ps && ps.length) return <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>{ps.map((pk) => <PlatformBadge key={pk} platform={pk} size="sm" />)}</span>;
      return <span style={mono}>{String(v)}</span>;
    }
    if (r.fmt === "text") return <span style={{ fontSize: 13, color: p.text }}>{String(v)}</span>;
    return <span style={mono}>{String(v)}</span>; // mono | bar
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
      {cols.map((c, j) => (
        <div
          key={c.name}
          style={{
            border: `1px solid ${c.isClient ? p.clientBorder : p.border}`,
            background: c.isClient ? p.clientCard : p.card,
            borderRadius: "var(--r-md)",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: `1px solid ${p.border}` }}>
            <span style={{ width: 32, height: 32, borderRadius: "var(--r-sm)", background: c.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 13, flexShrink: 0 }}>{c.brand}</span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: c.isClient ? p.clientText : p.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
              {c.isClient && <span style={{ fontSize: 9, color: p.clientText, fontFamily: "var(--font-mono)", letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 500 }}>· cliente</span>}
            </span>
          </div>
          <div>
            {rows.map((r, ri) => (
              <div key={r.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "9px 14px", borderTop: ri ? `1px solid ${p.border}` : "none", minHeight: 40 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: ".04em", textTransform: "uppercase", color: p.muted, flexShrink: 0 }}>{r.label}</span>
                <span style={{ textAlign: "right", minWidth: 0 }}>{valueFor(r, j)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
