/**
 * <InsightCard> — handoff §3.2.
 * kinds: opp (success) · thr (danger) · pat (info) · ano (warn)
 * border-left 3px del color del kind · badge eyebrow + título + body + footer
 * con confidence mono. Stagger 80ms en list mount.
 */

"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";

export type InsightKind = "opp" | "thr" | "pat" | "ano";

const meta: Record<InsightKind, { label: string; border: string; tone: string; bg: string }> = {
  opp: { label: "Oportunidad", border: "border-l-success", tone: "text-success", bg: "bg-success-soft" },
  thr: { label: "Amenaza", border: "border-l-danger", tone: "text-danger", bg: "bg-danger-soft" },
  pat: { label: "Patrón", border: "border-l-info", tone: "text-info", bg: "bg-info-soft" },
  ano: { label: "Anomalía", border: "border-l-warn", tone: "text-warn", bg: "bg-warn-soft" },
};

export interface InsightCardProps {
  kind: InsightKind;
  title: string;
  body: string;
  sources: number;
  confidence: string;
  evidenceUrl?: string;
  className?: string;
  /** Index para stagger en lista. */
  index?: number;
}

export function InsightCard({
  kind,
  title,
  body,
  sources,
  confidence,
  evidenceUrl,
  className,
  index = 0,
}: InsightCardProps) {
  const m = meta[kind];
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.2, 0.7, 0.3, 1], delay: index * 0.08 }}
      className={cn(
        "bg-white border border-n-200 border-l-[3px] rounded-md p-3.5",
        m.border,
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={cn("inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]", m.bg, m.tone)}>
          {m.label}
        </span>
        <span className="t-mono text-[11px] text-n-500 ml-auto">{sources} fuentes</span>
      </div>
      <h3 className="t-h3 text-n-900 mb-1">{title}</h3>
      <p className="t-small text-n-600 mb-3">{body}</p>
      <div className="flex items-center justify-between gap-2">
        {evidenceUrl ? (
          <a href={evidenceUrl} className={cn("text-[12px] font-medium underline", m.tone)}>
            Ver evidencia →
          </a>
        ) : (
          <span />
        )}
        <span className="font-mono tabular-nums text-[11px] text-n-500">conf. {confidence}</span>
      </div>
    </motion.article>
  );
}
