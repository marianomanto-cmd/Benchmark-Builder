/**
 * <BBBadge> — handoff §3.1.
 * Outline + dot interno. Tone toma color del dot por defecto; se puede
 * sobreescribir con `dot` (ej: badge "Instagram" usa dot del color de plataforma).
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "success" | "warn" | "danger" | "info" | "accent" | "neutral";
type Size = "sm" | "md";

const toneClasses: Record<Tone, string> = {
  success: "border-success/30 text-success bg-success-soft",
  warn: "border-warn/30 text-warn bg-warn-soft",
  danger: "border-danger/30 text-danger bg-danger-soft",
  info: "border-info/30 text-info bg-info-soft",
  accent: "border-sa-base/30 text-sa-strong bg-sa-soft",
  neutral: "border-n-200 text-n-700 bg-n-50",
};

const dotColor: Record<Tone, string> = {
  success: "bg-success",
  warn: "bg-warn",
  danger: "bg-danger",
  info: "bg-info",
  accent: "bg-sa-base",
  neutral: "bg-n-400",
};

export interface BBBadgeProps {
  tone?: Tone;
  size?: Size;
  dot?: string;
  children: ReactNode;
  className?: string;
}

export function BBBadge({
  tone = "neutral",
  size = "md",
  dot,
  children,
  className,
}: BBBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border font-medium whitespace-nowrap",
        size === "sm"
          ? "h-[18px] px-1.5 text-[10px]"
          : "h-[22px] px-2 text-[11px]",
        toneClasses[tone],
        className,
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", !dot && dotColor[tone])}
        style={dot ? { background: dot } : undefined}
      />
      {children}
    </span>
  );
}
