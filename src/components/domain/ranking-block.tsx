/**
 * <RankingBlock> — handoff §3.2.
 * Tres layouts sobre la misma idea de "Top N por métrica":
 *   grid  — top 3 con thumb grande
 *   list  — top 5-10 filas densas
 *   comparison_table — matriz competidor × métrica
 */

import { cn } from "@/lib/cn";
import { MediaThumb } from "./media-thumb";
import { SentimentChip } from "./sentiment";
import type { RankingItem, RankingTableRow } from "@/lib/fixtures/rankings";

type Metric = "engagement" | "reach" | "mentions";

interface BaseProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  metric?: Metric;
  className?: string;
}

type RankingBlockProps =
  | (BaseProps & { layout: "grid" | "list"; items: RankingItem[] })
  | (BaseProps & { layout: "comparison_table"; rows: RankingTableRow[] });

const BoltMark = () => (
  <span className="size-9 rounded-xs bg-sa-base grid place-items-center text-white shrink-0">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></svg>
  </span>
);

export function RankingBlock(props: RankingBlockProps) {
  return (
    <div className={cn("bg-white border border-n-200 rounded-md p-[18px]", props.className)}>
      <div className="flex justify-between items-baseline mb-3.5">
        <div>
          <div className="t-micro">{props.eyebrow}</div>
          <h3 className="t-h3 mt-1">{props.title}</h3>
        </div>
        {props.subtitle && <span className="t-micro text-n-500">{props.subtitle}</span>}
      </div>

      {props.layout === "grid" && (
        <div className="grid grid-cols-3 gap-3.5">
          {props.items.map((it) => (
            <div key={it.rank} className="flex flex-col gap-2">
              {it.kind && it.platform && <MediaThumb kind={it.kind} platform={it.platform} label={it.subtitle} />}
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[13px] text-sa-base font-semibold">#{it.rank}</span>
                <span className="text-[13px] font-medium truncate">{it.title}</span>
              </div>
              <div className="font-mono text-[24px] font-medium leading-none tracking-[-0.01em]">{it.metric}</div>
              {it.secondary && <div className="font-mono text-[11px] text-n-500">{it.secondary}</div>}
            </div>
          ))}
        </div>
      )}

      {props.layout === "list" && (
        <div className="flex flex-col">
          {props.items.map((it, i) => (
            <div key={it.rank} className={cn("flex items-center gap-3 py-2.5", i > 0 && "border-t border-n-100")}>
              <span className={cn("w-6 font-mono text-[12px] font-semibold", it.rank <= 3 ? "text-sa-base" : "text-n-500")}>
                #{it.rank}
              </span>
              <BoltMark />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">{it.title}</div>
                {it.secondary && <div className="font-mono text-[11px] text-n-500">spend · {it.secondary}</div>}
              </div>
              <div className="font-mono text-[16px] font-medium">{it.metric}</div>
            </div>
          ))}
        </div>
      )}

      {props.layout === "comparison_table" && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="text-n-500">
                {["", "Menciones", "Engagement", "Reach est.", "SOV", "Sentiment", "Top pieza"].map((h, i) => (
                  <th
                    key={i}
                    className={cn(
                      "px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] font-medium border-b border-n-200",
                      i > 0 ? "text-right" : "text-left",
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {props.rows.map((r) => (
                <tr key={r.name} className="border-b border-n-100">
                  <td className={cn("px-2.5 py-2.5", r.isClient ? "text-sa-base font-semibold" : "text-n-900 font-medium")}>{r.name}</td>
                  <td className="px-2.5 py-2.5 text-right font-mono">{r.mentions}</td>
                  <td className="px-2.5 py-2.5 text-right font-mono">{r.engagement}</td>
                  <td className="px-2.5 py-2.5 text-right font-mono">{r.reach}</td>
                  <td className="px-2.5 py-2.5 text-right font-mono">
                    <span className="inline-flex items-center gap-1.5 justify-end">
                      <span
                        className="h-1.5 rounded-full"
                        style={{ width: Math.min(60, r.sov * 1.2), background: r.isClient ? "var(--color-sa-base)" : "var(--color-n-900)" }}
                      />
                      {r.sov.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %
                    </span>
                  </td>
                  <td className="px-2.5 py-2.5 text-right">
                    <span className="inline-flex justify-end">
                      <SentimentChip kind={r.sentiment} label="" />
                    </span>
                  </td>
                  <td className="px-2.5 py-2.5 text-right text-[12px] text-n-600">{r.top}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export type { RankingBlockProps };
