/**
 * <KPI> — handoff §3.1.
 * Tile de métrica con label / value mono / delta opcional + sparkline o barra.
 * Value animado de 0 → target con motion useSpring (1s ease.out).
 * tone='ink' (max 1 por pantalla) = fondo n-900, texto blanco.
 */

"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/cn";
import { Skel } from "./skel";
import { Sparkline } from "./sparkline";

export interface KPIProps {
  label: string;
  /** Valor numérico para animar. Si pasás `value` ya formateado, animación se omite. */
  numericValue?: number;
  /** Valor pre-formateado (mono). Tiene prioridad sobre numericValue para display. */
  value?: string;
  /** Función para formatear el numericValue mientras anima. Default: `Math.round`. */
  format?: (n: number) => string;
  delta?: string;
  up?: boolean;
  sparkData?: number[];
  bar?: number;
  tone?: "default" | "ink";
  empty?: boolean;
  skeleton?: boolean;
  className?: string;
}

const TrendIcon = ({ up }: { up: boolean }) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
    {up ? (
      <path d="M7 17 17 7m0 0H9m8 0v8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <path d="M17 7 7 17m0 0h8m-8 0V9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    )}
  </svg>
);

function AnimatedNumber({
  target,
  format,
}: {
  target: number;
  format: (n: number) => string;
}) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { duration: 1000, bounce: 0 });
  const text = useTransform(spring, (v) => format(v));

  useEffect(() => {
    mv.set(target);
  }, [target, mv]);

  return <motion.span>{text}</motion.span>;
}

export function KPI({
  label,
  numericValue,
  value,
  format = (n) => Math.round(n).toLocaleString("es-AR"),
  delta,
  up = true,
  sparkData,
  bar,
  tone = "default",
  empty,
  skeleton,
  className,
}: KPIProps) {
  const isInk = tone === "ink";

  if (skeleton) {
    return (
      <div
        className={cn(
          "rounded-md border p-4 flex flex-col gap-3",
          isInk ? "bg-n-900 border-n-800" : "bg-white border-n-200",
          className,
        )}
      >
        <Skel w={60} h={11} />
        <Skel w={120} h={28} />
        <Skel w={80} h={12} />
      </div>
    );
  }

  if (empty) {
    return (
      <div
        className={cn(
          "rounded-md border border-dashed border-n-300 p-4 flex flex-col gap-2 bg-n-50/50",
          className,
        )}
      >
        <div className="t-micro">{label}</div>
        <div className="t-mono text-[28px] text-n-400 leading-none">—</div>
        <div className="t-small text-n-500">Sin datos todavía</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-md border p-4 flex flex-col gap-2.5 transition-shadow hover:shadow-2",
        isInk ? "bg-n-900 border-n-800 text-white" : "bg-white border-n-200",
        className,
      )}
    >
      <div className={cn("t-micro", isInk && "text-n-300")}>{label}</div>
      <div
        className={cn(
          "font-mono tabular-nums text-[30px] font-medium leading-none tracking-[-0.01em]",
          isInk ? "text-white" : "text-n-900",
        )}
      >
        {value ?? (numericValue !== undefined ? (
          <AnimatedNumber target={numericValue} format={format} />
        ) : (
          "—"
        ))}
      </div>

      {(delta || sparkData || typeof bar === "number") && (
        <div className="flex items-end justify-between gap-3">
          {delta && (
            <span
              className={cn(
                "inline-flex items-center gap-1 font-mono tabular-nums text-[12px]",
                up
                  ? isInk
                    ? "text-success-soft"
                    : "text-success"
                  : isInk
                    ? "text-danger-soft"
                    : "text-danger",
              )}
            >
              <TrendIcon up={up} />
              {delta}
            </span>
          )}

          {sparkData && (
            <Sparkline
              data={sparkData}
              width={100}
              height={28}
              color={isInk ? "var(--color-n-300)" : "var(--color-n-700)"}
            />
          )}

          {typeof bar === "number" && (
            <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-n-800/40">
              <motion.div
                className="h-full bg-sa-base"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, bar))}%` }}
                transition={{ duration: 0.6, ease: [0.2, 0.7, 0.3, 1] }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
