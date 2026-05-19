/**
 * <CompetitorCard> — handoff §3.2.
 * Resumen del competidor: name + handle + plataformas + 3 stats + sparkline 14 pts.
 * `accent` neutro para no-cliente, sangría para cliente (Copa en el demo).
 * Hover: border n-300→n-400, sombra sh-2. Sparkline anima al mount.
 */

"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { Sparkline } from "@/components/ui";
import { PlatformBadge, type PlatformKey } from "./platform-badge";
import { SentimentChip, type SentimentKind } from "./sentiment";

export interface CompetitorCardProps {
  name: string;
  handle: string;
  brand: string;
  accent?: string;
  platforms: PlatformKey[];
  mentions: string;
  sov: string;
  sent: SentimentKind;
  sparkData: number[];
  onClick?: () => void;
  className?: string;
}

export function CompetitorCard({
  name,
  handle,
  brand,
  accent = "var(--color-n-700)",
  platforms,
  mentions,
  sov,
  sent,
  sparkData,
  onClick,
  className,
}: CompetitorCardProps) {
  const isClient = accent === "var(--color-sa-base)";
  const Component = onClick ? "button" : "div";
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15, ease: [0.2, 0.7, 0.3, 1] }}>
      <Component
        onClick={onClick}
        className={cn(
          "block w-full text-left bg-white border rounded-md p-3.5 transition-colors duration-150",
          "hover:shadow-2",
          isClient ? "border-sa-base/40 bg-sa-soft/40" : "border-n-200 hover:border-n-400",
          className,
        )}
      >
        {/* Top row: brand letter + name */}
        <div className="flex items-start gap-3 mb-3">
          <span
            className="size-9 rounded-md grid place-items-center text-white font-semibold text-[14px] shrink-0"
            style={{ background: accent }}
          >
            {brand}
          </span>
          <div className="flex-1 min-w-0">
            <div className="t-h3 truncate" style={{ color: isClient ? "var(--color-sa-strong)" : undefined }}>
              {name}
            </div>
            <div className="t-mono text-[11px] text-n-500 truncate">{handle}</div>
          </div>
        </div>

        {/* Platforms */}
        <div className="flex gap-1 mb-3 flex-wrap">
          {platforms.map((p) => (
            <PlatformBadge key={p} platform={p} size="sm" />
          ))}
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div>
            <div className="t-micro">Menciones</div>
            <div className="font-mono tabular-nums text-[15px] font-medium text-n-900">{mentions}</div>
          </div>
          <div>
            <div className="t-micro">SOV</div>
            <div className="font-mono tabular-nums text-[15px] font-medium text-n-900">{sov}</div>
          </div>
          <div>
            <div className="t-micro">Sentimiento</div>
            <SentimentChip kind={sent} label="" />
          </div>
        </div>

        {/* Sparkline */}
        <div className="mt-2 -mb-1">
          <Sparkline
            data={sparkData}
            width={220}
            height={36}
            color={accent}
            strokeWidth={1.5}
            className="w-full"
          />
        </div>
      </Component>
    </motion.div>
  );
}
