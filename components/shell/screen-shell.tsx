"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, Layers } from "lucide-react";
import { Ic, NavIc } from "@/components/ui/icons";
import { Btn } from "@/components/ui/primitives";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette";
import { RunAssistant } from "@/components/run-assistant";

// Nav maps the compact sidebar glyphs to the project screens.
const NAV: { href: string; icon: (s?: number) => ReactNode; title: string }[] = [
  { href: "/proyectos", icon: (s = 15) => <Layers size={s} />, title: "Proyectos" },
  { href: "/overview", icon: NavIc.grid, title: "Overview" },
  { href: "/live-feed", icon: NavIc.folder, title: "Live feed" },
  { href: "/comparativa", icon: NavIc.users, title: "Comparativa" },
  { href: "/galeria", icon: NavIc.doc, title: "Galería" },
  { href: "/swot", icon: NavIc.bulb, title: "FODA & Estrategia" },
  { href: "/editor", icon: NavIc.bell, title: "Editor de reporte" },
  { href: "/settings", icon: NavIc.cog, title: "Settings" },
];

export function ScreenShell({
  children,
  breadcrumb,
  badges,
  runMeta,
}: {
  children: ReactNode;
  breadcrumb: string[];
  badges?: ReactNode;
  runMeta?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const colors = {
    bg: "var(--bg)",
    sb: "#181410",
    tb: "var(--surface)",
    border: "var(--border)",
    text: "var(--text)",
    muted: "var(--text-muted)",
  };
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div style={{ width: "100%", height: "100dvh", display: "flex", background: "color-mix(in srgb, var(--bg) 86%, transparent)", color: colors.text, overflow: "hidden" }}>
      <CommandPalette />
      <RunAssistant />

      {/* Mobile nav drawer (opened from the header hamburger; the sidebar is
          hidden on mobile so it doesn't eat horizontal space). */}
      {navOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 90 }}>
          <div onClick={() => setNavOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }} />
          <nav style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "min(78vw, 280px)", background: colors.sb, borderRight: `1px solid ${colors.border}`, display: "flex", flexDirection: "column", padding: "16px 12px", gap: 4, overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px 12px" }}>
              <Link href="/" onClick={() => setNavOpen(false)} style={{ display: "inline-flex", alignItems: "center", gap: 9, color: "#fff", textDecoration: "none", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase" }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--accent)" }} /> Benchmark
              </Link>
              <button type="button" onClick={() => setNavOpen(false)} aria-label="Cerrar menú" style={{ border: "none", background: "transparent", color: "#847a68", cursor: "pointer", display: "inline-flex" }}><X size={18} /></button>
            </div>
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setNavOpen(false)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: "var(--r-sm)", color: active ? "#fff" : "#a89e8b", background: active ? "#2a241c" : "transparent", borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent", fontSize: 14, textDecoration: "none" }}
                >
                  {item.icon(16)} {item.title}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* compact sidebar — hidden on mobile (replaced by the drawer) */}
      <aside className="bb-sidebar" style={{ width: 64, background: colors.sb, borderRight: `1px solid ${colors.border}`, display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 0", gap: 6, position: "relative", flexShrink: 0 }}>
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 2, background: "var(--accent)" }} />
        <Link href="/" style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", marginBottom: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />
        </Link>
        {NAV.filter((i) => i.href !== "/settings").map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.title}
              style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--r-sm)", color: active ? "#fff" : "#847a68", background: active ? "#2a241c" : "transparent", borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent", marginLeft: active ? -2 : 0 }}
            >
              {item.icon(15)}
            </Link>
          );
        })}
        <div style={{ flex: 1 }} />
        <Link href="/settings" title="Settings" style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--r-sm)", color: pathname.startsWith("/settings") ? "#fff" : "#847a68", background: pathname.startsWith("/settings") ? "#2a241c" : "transparent" }}>
          {NavIc.cog(15)}
        </Link>
        <span style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--border-strong)", marginTop: 6 }} />
      </aside>

      {/* main */}
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header className="bb-shell-header" style={{ height: 56, background: colors.tb, borderBottom: `1px solid ${colors.border}`, display: "flex", alignItems: "center", padding: "0 24px", gap: 12, flexShrink: 0 }}>
          <button type="button" className="bb-only-sm" onClick={() => setNavOpen(true)} aria-label="Abrir menú" style={{ border: "none", background: "transparent", color: colors.text, cursor: "pointer", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 4, marginLeft: -4 }}>
            <Menu size={20} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, minWidth: 0, overflow: "hidden", whiteSpace: "nowrap" }}>
            {breadcrumb.map((b, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span style={{ color: i === breadcrumb.length - 1 ? colors.text : colors.muted, fontWeight: i === breadcrumb.length - 1 ? 500 : 400, overflow: "hidden", textOverflow: "ellipsis" }}>{b}</span>
                {i < breadcrumb.length - 1 && <span style={{ color: "var(--text-faint)" }}>/</span>}
              </span>
            ))}
            <span className="bb-hide-sm" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              {badges}
              {runMeta && <span style={{ color: "var(--border-strong)", fontFamily: "var(--font-mono)", fontSize: 11, marginLeft: 6 }}>· {runMeta}</span>}
            </span>
          </div>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="bb-hide-sm"
            onClick={() => window.dispatchEvent(new Event("bb:command"))}
            style={{ display: "flex", alignItems: "center", border: `1px solid ${colors.border}`, borderRadius: "var(--r-sm)", padding: "4px 10px", background: "var(--surface-2)", width: 280, cursor: "pointer" }}
          >
            <span style={{ color: "var(--text-faint)" }}><Ic.search s={12} /></span>
            <span style={{ marginLeft: 8, fontSize: 12, color: "var(--text-muted)" }}>Buscar en el run…</span>
            <span style={{ marginLeft: "auto", fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-faint)", padding: "1px 5px", border: `1px solid ${colors.border}`, borderRadius: 3 }}>⌘K</span>
          </button>
          <ThemeToggle />
          <span className="bb-hide-sm"><Btn kind="ghost" size="sm" icon={<Ic.presentation s={12} />} onClick={() => router.push("/reporte")}>Presentación</Btn></span>
          <Btn kind="primary" size="sm" icon={<Ic.bolt s={11} />} onClick={() => router.push("/")}>Nuevo run</Btn>
        </header>
        <div className="bb-shell-content" style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 24 }}>{children}</div>
      </main>
    </div>
  );
}
