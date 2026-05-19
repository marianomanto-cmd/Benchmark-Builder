/**
 * <MentionCard> — handoff §3.2.
 * Header (platform + author + brand + AD ribbon) → thumb opcional 140px → body
 * (line-clamp 2 con thumb, 4 sin thumb) → footer (métricas mono + sentiment).
 * Hover: shadow none → sh-2 (150ms). AD ribbon entrada translateX(-4)→0 + fade.
 */

"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { PlatformBadge, type PlatformKey } from "./platform-badge";
import { SentimentChip, type SentimentKind } from "./sentiment";
import { BBBadge } from "@/components/ui";

export interface MentionCardProps {
  platform: PlatformKey;
  author: string;
  handle: string;
  ts: string;
  brand: string;
  body: string;
  metrics?: [string, string][];
  sentiment: SentimentKind;
  thumbType?: "photo" | "video" | "article" | "ad";
  isAd?: boolean;
  permalink?: string;
  thumbSrc?: string;
  className?: string;
}

const PlayBadge = () => (
  <span className="absolute inset-0 grid place-items-center">
    <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="rgba(0,0,0,0.45)" />
      <path d="m10 8 6 4-6 4z" fill="white" />
    </svg>
  </span>
);

export function MentionCard({
  platform,
  author,
  handle,
  ts,
  brand,
  body,
  metrics = [],
  sentiment,
  thumbType,
  isAd,
  permalink,
  thumbSrc,
  className,
}: MentionCardProps) {
  const hasThumb = !!thumbType;

  const content = (
    <article
      className={cn(
        "relative bg-white border border-n-200 rounded-md overflow-hidden",
        "transition-shadow duration-150 ease-[var(--ease-out)] hover:shadow-2",
        permalink && "cursor-pointer",
        className,
      )}
    >
      {/* Header */}
      <header className="flex items-center gap-2 px-3.5 pt-3 pb-2">
        <PlatformBadge platform={platform} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="t-small font-medium text-n-900 truncate leading-tight">{author}</div>
          <div className="t-mono text-[11px] text-n-500 truncate">
            {handle} · {ts}
          </div>
        </div>
        <BBBadge tone="neutral" size="sm">
          {brand}
        </BBBadge>
      </header>

      {/* Thumb */}
      {hasThumb && (
        <div
          className="relative w-full h-[140px] bg-n-100 border-t border-b border-n-100 overflow-hidden"
          style={
            thumbSrc
              ? { backgroundImage: `url(${thumbSrc})`, backgroundSize: "cover", backgroundPosition: "center" }
              : { background: "linear-gradient(135deg, var(--color-n-200), var(--color-n-300))" }
          }
        >
          {thumbType === "video" && <PlayBadge />}
        </div>
      )}

      {/* Body */}
      <p
        className={cn(
          "px-3.5 py-2.5 text-[13px] leading-[19px] text-n-700",
          hasThumb ? "line-clamp-2" : "line-clamp-4",
        )}
      >
        {body}
      </p>

      {/* Footer */}
      <footer className="px-3.5 pb-3 pt-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {metrics.map(([k, v], i) => (
            <span key={i} className="font-mono tabular-nums text-[11px] text-n-500">
              <span className="mr-1">{k}</span>
              {v}
            </span>
          ))}
        </div>
        <SentimentChip kind={sentiment} />
      </footer>

      {/* AD ribbon — §1.8 */}
      {isAd && (
        <motion.div
          initial={{ x: -4, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.2, ease: [0.2, 0.7, 0.3, 1] }}
          className="absolute top-0 right-0 bg-sa-base text-white px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.08em] rounded-bl-sm"
          aria-label="Anuncio pago"
        >
          AD
        </motion.div>
      )}
    </article>
  );

  if (permalink) {
    return (
      <a
        href={permalink}
        target="_blank"
        rel="noreferrer noopener"
        className="block"
        aria-label={`Ver publicación de ${author} en ${platform}`}
      >
        {content}
      </a>
    );
  }
  return content;
}
