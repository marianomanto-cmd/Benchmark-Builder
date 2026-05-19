/**
 * <Skel> — handoff §3.1.
 * Shimmer gradient real (gap del mock que era estático).
 * Animación: bb-shimmer 1.4s ease-in-out infinite (globals.css).
 */

import { cn } from "@/lib/cn";

export interface SkelProps {
  w?: number | string;
  h?: number | string;
  className?: string;
  rounded?: "sm" | "md" | "lg" | "full";
}

export function Skel({ w, h, className, rounded = "sm" }: SkelProps) {
  const r =
    rounded === "full"
      ? "rounded-full"
      : rounded === "lg"
        ? "rounded-lg"
        : rounded === "md"
          ? "rounded-md"
          : "rounded-sm";
  return (
    <span
      className={cn("bb-skel block", r, className)}
      style={{
        width: typeof w === "number" ? `${w}px` : w,
        height: typeof h === "number" ? `${h}px` : h,
      }}
      aria-hidden
    />
  );
}
