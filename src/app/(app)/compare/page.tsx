/**
 * Comparativa (03) — handoff §4.3.
 * Matriz densa filas=métricas, columnas=competidores. Columna cliente (Copa)
 * en sa-soft. Bars animan width 0→target con stagger. Hover resalta fila+columna.
 */

"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Btn } from "@/components/ui";
import { PlatformBadge, SentimentChip } from "@/components/domain";
import {
  COMPARE_COLS,
  COMPARE_ROWS,
  COMPARE_PLATS,
  isSentiment,
} from "@/lib/fixtures/comparativa";
import { cn } from "@/lib/cn";

const IcDownload = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" />
  </svg>
);
const IcCopy = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
);

export default function ComparePage() {
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  return (
    <div className="p-6 max-w-[1400px] mx-auto flex flex-col gap-4">
      <div className="flex justify-between items-baseline gap-4">
        <div>
          <div className="t-micro text-sa-base">COMPARATIVA · LADO A LADO</div>
          <h1 className="t-h1 mt-1.5">Una matriz para entender la competencia</h1>
        </div>
        <div className="flex gap-2 shrink-0">
          <Btn kind="secondary" size="sm" icon={IcDownload}>
            CSV
          </Btn>
          <Btn kind="secondary" size="sm" icon={IcCopy}>
            Insertar en reporte
          </Btn>
        </div>
      </div>

      <div className="bg-white border border-n-200 rounded-md overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="px-4 py-3.5 text-left t-micro border-b border-n-200 w-[200px] sticky left-0 bg-white z-10">
                Métrica
              </th>
              {COMPARE_COLS.map((c, j) => (
                <th
                  key={c.id}
                  onMouseEnter={() => setHoverCol(j)}
                  onMouseLeave={() => setHoverCol(null)}
                  className={cn(
                    "px-4 py-3.5 text-left border-b border-l border-n-200 transition-colors",
                    c.isClient ? "bg-sa-soft" : hoverCol === j ? "bg-n-50" : "",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="size-8 rounded-sm grid place-items-center text-white font-semibold text-[13px] shrink-0"
                      style={{ background: c.accent }}
                    >
                      {c.brand}
                    </span>
                    <div>
                      <div className={cn("text-[14px] font-semibold", c.isClient ? "text-sa-strong" : "text-n-900")}>
                        {c.name}
                      </div>
                      {c.isClient && <div className="t-mono text-[9px] text-sa-base uppercase tracking-[0.08em] font-medium">· cliente</div>}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((r, i) => (
              <tr key={r.label} className="group">
                <td className="px-4 py-3.5 font-medium text-n-700 border-b border-n-100 bg-n-50 sticky left-0 z-10 group-hover:bg-n-100 transition-colors">
                  {r.label}
                </td>
                {r.vals.map((v, j) => {
                  const col = COMPARE_COLS[j]!;
                  return (
                    <td
                      key={j}
                      onMouseEnter={() => setHoverCol(j)}
                      onMouseLeave={() => setHoverCol(null)}
                      className={cn(
                        "px-4 py-3.5 border-b border-l border-n-100 transition-colors",
                        col.isClient ? "bg-sa-soft" : hoverCol === j ? "bg-n-50" : "",
                        "group-hover:brightness-[0.985]",
                      )}
                    >
                      <Cell fmt={r.fmt} value={v} col={j} rowIndex={i} accent={col.accent} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cell({
  fmt,
  value,
  col,
  rowIndex,
  accent,
}: {
  fmt: string;
  value: string;
  col: number;
  rowIndex: number;
  accent: string;
}) {
  if (fmt === "mono") {
    return <span className="font-mono tabular-nums text-[15px] font-medium">{value}</span>;
  }
  if (fmt === "text") {
    return <span className="text-[12px] text-n-700">{value}</span>;
  }
  if (fmt === "sent" && isSentiment(value)) {
    return <SentimentChip kind={value} big />;
  }
  if (fmt === "plats") {
    const plats = COMPARE_PLATS[col] ?? [];
    return (
      <div className="flex gap-1">
        {plats.map((p) => (
          <PlatformBadge key={p} platform={p} size="sm" />
        ))}
      </div>
    );
  }
  if (fmt === "bar") {
    const num = parseFloat(value.replace(",", "."));
    return (
      <div>
        <div className="font-mono tabular-nums text-[15px] font-medium">{value}</div>
        <div className="h-1.5 bg-n-100 rounded-full mt-1.5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: accent }}
            initial={{ width: 0 }}
            animate={{ width: `${num * 2}%` }}
            transition={{ duration: 0.6, ease: [0.2, 0.7, 0.3, 1], delay: rowIndex * 0.08 }}
          />
        </div>
      </div>
    );
  }
  return <span>{value}</span>;
}
