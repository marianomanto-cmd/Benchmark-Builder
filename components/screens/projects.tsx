"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Folder } from "lucide-react";
import { ScreenShell } from "@/components/shell/screen-shell";
import { Btn } from "@/components/ui/primitives";
import { Ic } from "@/components/ui/icons";

type Project = { slug: string; name: string; category: string; runs: number; lastRun: string; budget: number; accent: string };

export function Projects({ projects }: { projects: Project[] }) {
  return (
    <ScreenShell breadcrumb={["@nav.dashboard", "@shell.nav.projects"]} runMeta={`${projects.length}`} nav="app">
      <div className="bb-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, marginBottom: 18 }}>
        <div>
          <div className="t-micro" style={{ color: "var(--accent)" }}>WORKSPACE</div>
          <div className="t-h1" style={{ marginTop: 6, color: "var(--text)" }}>Tus proyectos</div>
          <div className="t-small" style={{ color: "var(--text-muted)", marginTop: 4 }}>Carpetas que agrupan tus runs por marca o caso.</div>
        </div>
        <Link href="/"><Btn kind="accent" size="sm" iconRight={<Ic.bolt s={11} />}>Nuevo proyecto</Btn></Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {projects.map((p, i) => (
          <motion.div key={p.slug} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, delay: i * 0.05 }}>
            <Link href={`/proyecto/${p.slug}`} className="bb-lift" style={{ textDecoration: "none", color: "inherit", display: "block", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 16, boxShadow: "var(--sh-1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ width: 38, height: 38, borderRadius: "var(--r-sm)", background: `color-mix(in srgb, ${p.accent} 22%, transparent)`, color: p.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Folder size={18} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{p.category}</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                <span>{p.runs} runs</span>
                <span>{p.lastRun}</span>
                <span>cap US${p.budget}</span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>
        Crear / renombrar / eliminar proyectos: pendiente (requiere auth/multi-tenancy).
      </div>
    </ScreenShell>
  );
}
