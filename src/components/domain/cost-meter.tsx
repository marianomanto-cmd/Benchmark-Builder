/**
 * <CostMeter> — handoff §3.2.
 * Barra de progreso USD usado / soft / hard con marca vertical en soft.
 * Color: success < soft · warn ≥ soft · danger ≥ hard.
 * `live`: anima el contador con useSpring. Pulse al cruzar soft.
 */

"use client";

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";

export interface CostMeterProps {
  used: number;
  soft: number;
  hard: number;
  period: string;
  live?: boolean;
  className?: string;
}

export function CostMeter({ used, soft, hard, period, live, className }: CostMeterProps) {
  const pct = Math.min(100, (used / hard) * 100);
  const softPct = (soft / hard) * 100;
  const state = used >= hard ? "over" : used >= soft ? "warn" : "ok";

  const barColor =
    state === "over" ? "bg-danger" : state === "warn" ? "bg-warn" : "bg-success";

  const mv = useMotionValue(0);
  const spring = useSpring(mv, { duration: 800, bounce: 0 });
  const text = useTransform(spring, (v) => formatCurrency(v));

  useEffect(() => {
    if (live) mv.set(used);
    else mv.set(used);
  }, [used, live, mv]);

  return (
    <div className={cn("bg-white border border-n-200 rounded-md p-4", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="t-micro">{period}</span>
        <span
          className={cn(
            "font-mono text-[10px] uppercase tracking-[0.1em] font-semibold",
            state === "over" ? "text-danger" : state === "warn" ? "text-warn" : "text-success",
          )}
        >
          {state === "over" ? "EXCEDIDO" : state === "warn" ? "ATENCIÓN" : "OK"}
        </span>
      </div>

      <div className="flex items-baseline gap-1.5 mb-3">
        <motion.span className="font-mono tabular-nums text-[22px] font-medium text-n-900">
          {live ? text : formatCurrency(used)}
        </motion.span>
        <span className="font-mono text-[12px] text-n-500">/ {formatCurrency(hard)}</span>
      </div>

      <div className="relative h-2 rounded-full bg-n-100 overflow-hidden">
        {/* Soft threshold marker */}
        <div
          className="absolute top-0 bottom-0 w-px bg-n-400/60"
          style={{ left: `${softPct}%` }}
          aria-hidden
        />
        <motion.div
          className={cn("h-full transition-colors duration-300", barColor)}
          initial={{ width: 0 }}
          animate={{
            width: `${pct}%`,
            scale: state === "warn" ? [1, 1.03, 1] : 1,
          }}
          transition={{
            width: { duration: 0.6, ease: [0.2, 0.7, 0.3, 1] },
            scale: { duration: 0.6 },
          }}
          style={{ transformOrigin: "left" }}
        />
      </div>

      <div className="flex justify-between mt-1.5 text-[10px] font-mono text-n-500">
        <span>soft {formatCurrency(soft, { decimals: 0 })}</span>
        <span>hard {formatCurrency(hard, { decimals: 0 })}</span>
      </div>
    </div>
  );
}
