/**
 * <ScreenShell> — handoff §3.3.
 * Sidebar 64/240 (collapsed/expanded · hover expand 200ms) + topbar 56 + content scrollable.
 * Fondo sidebar n-900 con border-left 2px sangría en item activo.
 */

"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { SidebarIcons } from "./sidebar-icon";
import { Tooltip } from "@/components/ui";

interface NavItem {
  key: string;
  href: string;
  icon: ReactNode;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: "overview", href: "/overview", icon: SidebarIcons.dashboard, label: "Resumen" },
  { key: "feed", href: "/feed", icon: SidebarIcons.feed, label: "Live feed" },
  { key: "compare", href: "/compare", icon: SidebarIcons.compare, label: "Comparativa" },
  { key: "gallery", href: "/gallery", icon: SidebarIcons.gallery, label: "Galería" },
  { key: "plan", href: "/plan", icon: SidebarIcons.plan, label: "Plan" },
  { key: "editor", href: "/editor", icon: SidebarIcons.editor, label: "Editor" },
  { key: "report", href: "/report", icon: SidebarIcons.report, label: "Reporte" },
];

const BOTTOM_ITEMS: NavItem[] = [
  { key: "alerts", href: "/alerts", icon: SidebarIcons.alerts, label: "Alertas" },
  { key: "settings", href: "/settings", icon: SidebarIcons.settings, label: "Ajustes" },
];

export interface ScreenShellProps {
  children: ReactNode;
  /** Breadcrumb pills al inicio del topbar. */
  crumbs?: ReactNode;
  /** Acciones del topbar a la derecha. */
  actions?: ReactNode;
  /** Título del topbar (cuando no hay crumbs). */
  title?: string;
}

export function ScreenShell({ children, crumbs, actions, title }: ScreenShellProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="min-h-screen bg-paper flex">
      {/* Sidebar — desktop/tablet (≥768). En mobile va la bottom tab bar. */}
      <motion.aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        animate={{ width: expanded ? 240 : 64 }}
        transition={{ duration: 0.2, ease: [0.2, 0.7, 0.3, 1] }}
        className="bg-n-900 text-white hidden md:flex flex-col shrink-0 sticky top-0 h-screen overflow-hidden"
      >
        {/* Brand */}
        <div className="h-14 px-4 flex items-center gap-2.5 border-b border-n-800 shrink-0">
          <span className="size-6 rounded-sm bg-sa-base shrink-0 grid place-items-center text-white font-mono text-[11px] font-semibold">
            BB
          </span>
          {expanded && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15, delay: 0.05 }}
              className="t-h3 truncate"
            >
              Benchmark Builder
            </motion.span>
          )}
        </div>

        {/* Main nav */}
        <nav className="flex-1 flex flex-col gap-0.5 p-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.key} item={item} active={pathname.startsWith(item.href)} expanded={expanded} />
          ))}
        </nav>

        {/* Bottom nav */}
        <div className="border-t border-n-800 p-2 flex flex-col gap-0.5 shrink-0">
          {BOTTOM_ITEMS.map((item) => (
            <NavLink key={item.key} item={item} active={pathname.startsWith(item.href)} expanded={expanded} />
          ))}
        </div>
      </motion.aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="h-14 bg-paper/95 backdrop-blur border-b border-n-200 sticky top-0 z-30 flex items-center gap-3 px-6">
          {crumbs ? (
            <div className="flex items-center gap-1.5 text-[12px] text-n-700">{crumbs}</div>
          ) : (
            <div className="t-h3 truncate">{title}</div>
          )}
          <div className="flex-1" />
          <div className="hidden sm:flex items-center gap-2">{actions}</div>
        </header>

        {/* Content */}
        <main className="flex-1 min-w-0 pb-[78px] md:pb-0">{children}</main>
      </div>

      {/* Bottom tab bar — mobile (<768) */}
      <MobileTabBar pathname={pathname} />
    </div>
  );
}

const TAB_ITEMS: NavItem[] = [
  { key: "overview", href: "/overview", icon: SidebarIcons.dashboard, label: "Resumen" },
  { key: "feed", href: "/feed", icon: SidebarIcons.feed, label: "Feed" },
  { key: "compare", href: "/compare", icon: SidebarIcons.compare, label: "Compar." },
  { key: "report", href: "/report", icon: SidebarIcons.report, label: "Reportes" },
];

const MORE_ITEMS: NavItem[] = [
  { key: "gallery", href: "/gallery", icon: SidebarIcons.gallery, label: "Galería" },
  { key: "plan", href: "/plan", icon: SidebarIcons.plan, label: "Plan" },
  { key: "editor", href: "/editor", icon: SidebarIcons.editor, label: "Editor" },
  { key: "alerts", href: "/alerts", icon: SidebarIcons.alerts, label: "Alertas" },
  { key: "settings", href: "/settings", icon: SidebarIcons.settings, label: "Ajustes" },
];

function MobileTabBar({ pathname }: { pathname: string }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const onMainTab = TAB_ITEMS.some((t) => pathname.startsWith(t.href));

  return (
    <>
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            className="md:hidden fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="absolute inset-0 bg-n-900/50 backdrop-blur-[4px]" onClick={() => setMoreOpen(false)} />
            <motion.div
              className="absolute bottom-[78px] inset-x-3 bg-white rounded-md border border-n-200 shadow-4 p-2 grid grid-cols-3 gap-1.5"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2, ease: [0.2, 0.7, 0.3, 1] }}
            >
              {MORE_ITEMS.map((item) => (
                <Link
                  key={item.key}
                  href={item.href as never}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 py-3 rounded-sm text-[11px] font-medium transition-colors",
                    pathname.startsWith(item.href) ? "bg-sa-soft text-sa-strong" : "text-n-600 hover:bg-n-50",
                  )}
                >
                  <span className="size-5">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 h-16 bg-white border-t border-n-200 flex items-stretch pb-[max(0px,env(safe-area-inset-bottom))]">
        {TAB_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <motion.div key={item.key} className="flex-1" whileTap={{ scale: 0.92 }}>
              <Link
                href={item.href as never}
                className={cn(
                  "h-full flex flex-col items-center justify-center gap-1 text-[10px] border-t-2 -mt-px transition-colors",
                  active ? "text-sa-base border-sa-base font-medium" : "text-n-500 border-transparent",
                )}
              >
                <span className="size-[18px]">{item.icon}</span>
                {item.label}
              </Link>
            </motion.div>
          );
        })}
        <motion.div className="flex-1" whileTap={{ scale: 0.92 }}>
          <button
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            className={cn(
              "w-full h-full flex flex-col items-center justify-center gap-1 text-[10px] border-t-2 -mt-px transition-colors",
              !onMainTab || moreOpen ? "text-sa-base border-sa-base font-medium" : "text-n-500 border-transparent",
            )}
          >
            <span className="size-[18px]">{SidebarIcons.settings}</span>
            Más
          </button>
        </motion.div>
      </nav>
    </>
  );
}

function NavLink({ item, active, expanded }: { item: NavItem; active: boolean; expanded: boolean }) {
  const content = (
    <Link
      href={item.href as never}
      className={cn(
        "h-9 px-2.5 rounded-sm flex items-center gap-3 text-[13px] font-medium relative transition-colors",
        active ? "bg-n-800 text-white" : "text-n-300 hover:bg-n-800 hover:text-white",
      )}
    >
      {/* Active indicator border-left */}
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute left-0 top-1 bottom-1 w-0.5 bg-sa-base rounded-r-sm"
          transition={{ duration: 0.15, ease: [0.2, 0.7, 0.3, 1] }}
        />
      )}
      <span className="size-4 shrink-0">{item.icon}</span>
      {expanded && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15, delay: 0.05 }}
          className="truncate"
        >
          {item.label}
        </motion.span>
      )}
    </Link>
  );

  if (expanded) return content;
  return (
    <Tooltip content={item.label} side="right" delay={300}>
      {content}
    </Tooltip>
  );
}
