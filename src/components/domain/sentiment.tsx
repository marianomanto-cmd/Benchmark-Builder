/**
 * <SentimentChip> — handoff §3.2.
 * Score 0–1 mapeado:
 *   [0.0, 0.35)  → neg
 *   [0.35, 0.65) → neu o mix (mix si dispersión alta)
 *   [0.65, 1.0]  → pos
 */

import { cn } from "@/lib/cn";

export type SentimentKind = "pos" | "neu" | "neg" | "mix";

export function scoreToSentiment(score: number, dispersion = 0): SentimentKind {
  if (score < 0.35) return "neg";
  if (score >= 0.65) return "pos";
  return dispersion > 0.4 ? "mix" : "neu";
}

const dotColor: Record<SentimentKind, string> = {
  pos: "bg-success",
  neu: "bg-n-400",
  neg: "bg-danger",
  mix: "bg-warn",
};

const labelDefault: Record<SentimentKind, string> = {
  pos: "Positivo",
  neu: "Neutro",
  neg: "Negativo",
  mix: "Mixto",
};

export interface SentimentChipProps {
  kind: SentimentKind;
  big?: boolean;
  label?: string;
  className?: string;
}

export function SentimentChip({ kind, big, label, className }: SentimentChipProps) {
  const text = label === undefined ? labelDefault[kind] : label;
  const showLabel = text !== "";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium",
        big ? "text-[13px]" : "text-[11px]",
        className,
      )}
    >
      <span className={cn("rounded-full", dotColor[kind], big ? "size-2" : "size-1.5")} />
      {showLabel && <span className="text-n-700">{text}</span>}
    </span>
  );
}
