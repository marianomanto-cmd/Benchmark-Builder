"use client";

import Link from "next/link";
import { ScreenShell } from "@/components/shell/screen-shell";
import { Btn, BBBadge } from "@/components/ui/primitives";
import { Ic } from "@/components/ui/icons";

type Run = { number: number; mentions: number; cost: number; when: string; status: string; title?: string; slug?: string };

function tone(status: string): "success" | "warn" | "neutral" {
  if (status === "done") return "success";
  if (status === "running") return "warn";
  return "neutral";
}

export function RunsHistory({ runs }: { runs: Run[] }) {
  return (
    <ScreenShell breadcrumb={["Proyectos", "Runs"]} runMeta={`${runs.length} runs`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <div>
          <div className="t-micro" style={{ color: "var(--accent)" }}>HISTORIAL</div>
          <div className="t-h1" style={{ marginTop: 6, color: "var(--text)" }}>Runs del proyecto</div>
        </div>
        <Link href="/"><Btn kind="accent" size="sm" iconRight={<Ic.bolt s={11} />}>Nuevo run</Btn></Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        {runs.map((r) => (
          <Link
            key={r.number}
            href={`/overview${r.slug ? `?case=${r.slug}` : ""}`}
            className="bb-lift"
            style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", gap: 10, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 16, boxShadow: "var(--sh-1)" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text)", fontWeight: 500 }}>run #{String(r.number).padStart(3, "0")}</span>
              <BBBadge tone={tone(r.status)} size="sm">{r.status}</BBBadge>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{r.title ?? "Investigación"}</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
              <span>{r.when}</span>
              <span>{r.mentions} menc.</span>
              <span>USD {r.cost.toFixed(2)}</span>
            </div>
          </Link>
        ))}
      </div>
    </ScreenShell>
  );
}
