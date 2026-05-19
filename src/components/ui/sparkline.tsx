/**
 * <Sparkline> — SVG con stroke-dasharray animado.
 * Animación: dash-offset 100% → 0, 800ms ease-out al mount (handoff §3.2).
 */

"use client";

import { useId, useMemo } from "react";
import { motion } from "motion/react";
import { duration, ease } from "@/lib/motion";

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: string;
  strokeWidth?: number;
  className?: string;
}

export function Sparkline({
  data,
  width = 120,
  height = 32,
  color = "var(--color-n-700)",
  fill,
  strokeWidth = 1.5,
  className,
}: SparklineProps) {
  const id = useId();

  const path = useMemo(() => {
    if (data.length === 0) return "";
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = data.length > 1 ? width / (data.length - 1) : 0;
    const pad = 2;
    const h = height - pad * 2;
    return data
      .map((v, i) => {
        const x = i * stepX;
        const y = pad + h - ((v - min) / range) * h;
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }, [data, width, height]);

  if (!path) return null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
    >
      {fill && (
        <path
          d={`${path} L${width},${height} L0,${height} Z`}
          fill={fill}
          opacity="0.3"
        />
      )}
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: ease.out }}
        id={id}
      />
    </svg>
  );
}

// Suprimir warning de variable no usada
void duration;
