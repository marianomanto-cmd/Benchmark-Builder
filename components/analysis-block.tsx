import type { AnalysisVM } from "@/lib/view-models";

export function AnalysisBlock({ analysis }: { analysis: AnalysisVM }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderLeft: "3px solid var(--accent)", borderRadius: "var(--r-md)", padding: 18, boxShadow: "var(--sh-1)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span className="t-micro" style={{ color: "var(--accent)" }}>✦ Análisis + Insights</span>
      </div>
      <div style={{ fontFamily: "var(--font-serif)", fontSize: 20, lineHeight: "27px", fontWeight: 500, color: "var(--text)", textWrap: "balance", marginBottom: 8 }}>{analysis.headline}</div>
      <p style={{ fontSize: 14, lineHeight: "21px", color: "var(--text-muted)", textWrap: "pretty", margin: 0 }}>{analysis.body}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
        <div>
          <div className="t-micro" style={{ marginBottom: 8 }}>Key takeaways</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {analysis.takeaways.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--text)", lineHeight: "18px" }}>
                <span style={{ color: "var(--success)", flexShrink: 0 }}>✓</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="t-micro" style={{ marginBottom: 8 }}>Recomendaciones</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {analysis.recommendations.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--text)", lineHeight: "18px" }}>
                <span style={{ color: "var(--accent)", flexShrink: 0 }}>→</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
