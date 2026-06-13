"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Ic, NavIc } from "@/components/ui/icons";
import { Btn } from "@/components/ui/primitives";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette";

// Nav maps the compact sidebar glyphs to the project screens.
const NAV: { href: string; icon: (s?: number) => ReactNode; title: string }[] = [
  { href: "/overview", icon: NavIc.grid, title: "Overview" },
  { href: "/live-feed", icon: NavIc.folder, title: "Live feed" },
  { href: "/comparativa", icon: NavIc.users, title: "Comparativa" },
  { href: "/galeria", icon: NavIc.doc, title: "Galería" },
  { href: "/research-plan", icon: NavIc.bulb, title: "Plan de research" },
  { href: "/editor", icon: NavIc.bell, title: "Editor de reporte" },
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
  const colors = {
    bg: "var(--bg)",
    sb: "#181410",
    tb: "var(--surface)",
    border: "var(--border)",
    text: "var(--text)",
    muted: "var(--text-muted)",
  };
  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", background: colors.bg, color: colors.text, overflow: "hidden" }}>
      <CommandPalette />
      {/* sidebar compact */}
      <aside style={{ width: 64, background: colors.sb, borderRight: `1px solid ${colors.border}`, display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 0", gap: 6, position: "relative", flexShrink: 0 }}>
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 2, background: "var(--accent)" }} />
        <Link href="/" style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", marginBottom: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />
        </Link>
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.title}
              style={{
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "var(--r-sm)",
                color: active ? "#fff" : "#847a68",
                background: active ? "#2a241c" : "transparent",
                borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
                marginLeft: active ? -2 : 0,
              }}
            >
              {item.icon(15)}
            </Link>
          );
        })}
        <div style={{ flex: 1 }} />
        <Link
          href="/settings"
          title="Settings"
          style={{
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "var(--r-sm)",
            color: pathname.startsWith("/settings") ? "#fff" : "#847a68",
            background: pathname.startsWith("/settings") ? "#2a241c" : "transparent",
          }}
        >
          {NavIc.cog(15)}
        </Link>
        <span style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--border-strong)", marginTop: 6 }} />
      </aside>

      {/* main */}
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ height: 56, background: colors.tb, borderBottom: `1px solid ${colors.border}`, display: "flex", alignItems: "center", padding: "0 24px", gap: 12, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, minWidth: 0 }}>
            {breadcrumb.map((b, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: i === breadcrumb.length - 1 ? colors.text : colors.muted, fontWeight: i === breadcrumb.length - 1 ? 500 : 400 }}>{b}</span>
                {i < breadcrumb.length - 1 && <span style={{ color: "var(--text-faint)" }}>/</span>}
              </span>
            ))}
            {badges}
            {runMeta && <span style={{ color: "var(--border-strong)", fontFamily: "var(--font-mono)", fontSize: 11, marginLeft: 6 }}>· {runMeta}</span>}
          </div>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("bb:command"))}
            style={{ display: "flex", alignItems: "center", border: `1px solid ${colors.border}`, borderRadius: "var(--r-sm)", padding: "4px 10px", background: "var(--surface-2)", width: 280, cursor: "pointer" }}
          >
            <span style={{ color: "var(--text-faint)" }}><Ic.search s={12} /></span>
            <span style={{ marginLeft: 8, fontSize: 12, color: "var(--text-muted)" }}>Buscar…</span>
            <span style={{ marginLeft: "auto", fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-faint)", padding: "1px 5px", border: `1px solid ${colors.border}`, borderRadius: 3 }}>⌘K</span>
          </button>
          <ThemeToggle />
          <Btn kind="ghost" size="sm" icon={<Ic.presentation s={12} />} onClick={() => router.push("/reporte")}>Presentación</Btn>
          <Btn kind="primary" size="sm" icon={<Ic.bolt s={11} />} onClick={() => router.push("/research-plan")}>Nuevo run</Btn>
        </header>
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 24 }}>{children}</div>
      </main>
    </div>
  );
}
