import { BBBarChart } from "@/components/ui/charts";
import type { ReportDoc } from "@/lib/report-doc";

// Read-only render of a report document (title + subtitle + blocks) on the white
// "paper" sheet. The single source of truth for rendering a doc — reused by the
// editor's preview mode and the public share page (/r/[token]). `accent` lets the
// white-label branding (task 6) recolor the accent; defaults to the brand sangría.
export function ReportDocView({ doc, accent = "var(--sa-base)" }: { doc: ReportDoc; accent?: string }) {
  return (
    <div style={{ color: "var(--n900)" }}>
      <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(28px, 5vw, 44px)", lineHeight: 1.05, fontWeight: 500, letterSpacing: "-0.02em", margin: "8px 0 6px", color: "var(--n900)" }}>{doc.title}</h1>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--n500)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 24 }}>{doc.subtitle}</div>

      {doc.blocks.map((b) => (
        <div key={b.id} style={{ margin: "0 0 16px" }}>
          {b.type === "h1" && <div style={{ fontFamily: "var(--font-serif)", fontSize: 28, lineHeight: "32px", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--n900)" }}>{b.text}</div>}
          {b.type === "h2" && <div style={{ fontFamily: "var(--font-serif)", fontSize: 20, lineHeight: "26px", fontWeight: 500, color: "var(--n800)" }}>{b.text}</div>}
          {b.type === "text" && <div style={{ fontFamily: "var(--font-serif)", fontSize: 16, lineHeight: "26px", color: "var(--n800)" }}>{b.text}</div>}
          {b.type === "quote" && (
            <div style={{ borderLeft: `3px solid ${accent}`, paddingLeft: 16 }}>
              <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 18, lineHeight: "26px", color: "var(--n900)" }}>{b.text}</div>
            </div>
          )}
          {b.type === "kpi" && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "10px 14px", background: "var(--n50)", borderRadius: 8, flexWrap: "wrap" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 30, fontWeight: 600, color: accent }}>{b.value}</div>
              <div style={{ fontSize: 13, color: "var(--n600)" }}>{b.text}</div>
            </div>
          )}
          {b.type === "list" && (
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {(b.items ?? []).map((it, i) => (
                <li key={i} style={{ fontFamily: "var(--font-serif)", fontSize: 16, lineHeight: "26px", color: "var(--n800)", marginBottom: 4 }}>{it}</li>
              ))}
            </ul>
          )}
          {b.type === "chart" && (
            <div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--n600)", marginBottom: 6 }}>{b.text}</div>
              <BBBarChart />
            </div>
          )}
          {b.type === "table" && (
            <div className="bb-scroll-x" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-sans)", fontSize: 14, minWidth: 360 }}>
                <tbody>
                  {(b.rows ?? []).map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} style={{ border: "1px solid var(--n300)", padding: "6px 10px", color: ri === 0 ? "var(--n900)" : "var(--n800)", fontWeight: ri === 0 ? 600 : 400, background: ri === 0 ? "var(--n50)" : "transparent", verticalAlign: "top" }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
