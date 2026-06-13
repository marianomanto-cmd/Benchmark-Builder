// Branded loading skeleton shown while the dashboard streams.
export default function Loading() {
  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>
      <div style={{ width: 64, background: "#181410", flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ height: 56, borderBottom: "1px solid var(--border)", background: "var(--surface)" }} />
        <div style={{ flex: 1, padding: 24 }}>
          <div style={{ height: 44, width: 360, borderRadius: "var(--r-sm)", marginBottom: 24 }} className="bb-shimmer" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 18 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ height: 108, borderRadius: "var(--r-sm)" }} className="bb-shimmer" />
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14 }}>
            <div style={{ height: 320, borderRadius: "var(--r-md)" }} className="bb-shimmer" />
            <div style={{ height: 320, borderRadius: "var(--r-md)" }} className="bb-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}
