/**
 * <Btn> — handoff §3.1.
 * kinds: primary | secondary | accent | ghost | destructive
 * sizes: sm | md | lg (28 / 34 / 40 desktop · 36 / 44 / 48 mobile)
 *
 * Regla del handoff: una sola `primary` por pantalla. `accent` (sangría) sólo
 * para CTAs de marca (Generar reporte, Aprobar y ejecutar).
 */

"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Kind = "primary" | "secondary" | "accent" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

export interface BtnProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  kind?: Kind;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
  children?: ReactNode;
}

const sizeClasses: Record<Size, string> = {
  // 28 / 34 / 40 desktop · 36 / 44 / 48 mobile (md: hit target ≥44)
  sm: "h-7 px-2.5 text-[12px] gap-1.5 md:h-7 md:px-2.5",
  md: "h-9 px-3.5 text-[13px] gap-1.5 md:h-[34px] md:px-3.5",
  lg: "h-10 px-4 text-[14px] gap-2 md:h-10",
};

const kindClasses: Record<Kind, string> = {
  primary:
    "bg-n-900 text-white border border-n-900 hover:bg-n-800 active:translate-y-px shadow-1",
  secondary:
    "bg-white text-n-900 border border-n-300 hover:border-n-400 hover:bg-n-50 active:translate-y-px",
  accent:
    "bg-sa-base text-white border border-sa-base hover:bg-sa-strong active:translate-y-px shadow-1",
  ghost: "bg-transparent text-n-900 border border-transparent hover:bg-n-100",
  destructive:
    "bg-white text-danger border border-danger hover:bg-danger-soft active:translate-y-px",
};

const Spinner = ({ size }: { size: Size }) => {
  const d = size === "sm" ? 12 : size === "md" ? 14 : 16;
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="origin-center [animation:spin_0.9s_linear_infinite]"
      />
    </svg>
  );
};

export const Btn = forwardRef<HTMLButtonElement, BtnProps>(function Btn(
  { kind = "secondary", size = "md", icon, iconRight, loading, disabled, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      data-loading={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-sm font-medium",
        "transition-[background-color,border-color,transform,box-shadow] duration-150 ease-[var(--ease-out)]",
        "disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-inherit",
        "group select-none whitespace-nowrap",
        sizeClasses[size],
        kindClasses[kind],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner size={size} /> : icon}
      {children}
      {iconRight && (
        <span className="transition-transform duration-150 ease-[var(--ease-out)] group-hover:translate-x-0.5">
          {iconRight}
        </span>
      )}
    </button>
  );
});
