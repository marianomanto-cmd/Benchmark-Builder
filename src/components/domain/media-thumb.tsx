/**
 * <MediaThumb> — handoff §3.2.
 * Placeholder o imagen + overlays + AD ribbon sangría top-right.
 * Hover scale interno 1.04 con overflow:hidden en el contenedor.
 * En producción: reemplazar el placeholder por <Image> (next/image) manteniendo
 * aspect-ratio, overlays y ribbon.
 */

import { cn } from "@/lib/cn";
import { PlatformBadge, type PlatformKey } from "./platform-badge";

type Ratio = "4/5" | "1/1" | "9/16";
type Kind = "photo" | "video" | "article" | "ad";

export interface MediaThumbProps {
  kind: Kind;
  platform: PlatformKey;
  isAd?: boolean;
  src?: string;
  label?: string;
  metrics?: string[];
  ratio?: Ratio;
  className?: string;
  onClick?: () => void;
}

const ratioClass: Record<Ratio, string> = {
  "4/5": "aspect-[4/5]",
  "1/1": "aspect-square",
  "9/16": "aspect-[9/16]",
};

const PlayIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="white" aria-hidden>
    <circle cx="12" cy="12" r="11" fill="rgba(0,0,0,0.4)" />
    <path d="m10 8 6 4-6 4z" fill="white" />
  </svg>
);

const ArticleIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" aria-hidden>
    <rect x="5" y="4" width="14" height="16" rx="1.5" fill="rgba(0,0,0,0.3)" />
    <path d="M8 9h8M8 13h8M8 17h5" strokeLinecap="round" />
  </svg>
);

export function MediaThumb({
  kind,
  platform,
  isAd,
  src,
  label,
  metrics,
  ratio = "4/5",
  className,
  onClick,
}: MediaThumbProps) {
  const Component = onClick ? "button" : "div";
  return (
    <Component
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-md border border-n-200 bg-n-100 group block w-full text-left",
        ratioClass[ratio],
        onClick && "cursor-pointer",
        className,
      )}
    >
      <div
        className="absolute inset-0 transition-transform duration-300 ease-[var(--ease-out)] group-hover:scale-[1.04]"
        style={
          src
            ? { backgroundImage: `url(${src})`, backgroundSize: "cover", backgroundPosition: "center" }
            : {
                background: `linear-gradient(135deg, var(--color-n-200), var(--color-n-300))`,
              }
        }
      >
        {!src && (
          <div className="absolute inset-0 grid place-items-center text-n-500">
            {kind === "video" && <PlayIcon />}
            {kind === "article" && <ArticleIcon />}
          </div>
        )}
      </div>

      {/* Platform badge top-left */}
      <div className="absolute top-2 left-2">
        <PlatformBadge platform={platform} size="sm" />
      </div>

      {/* AD ribbon — handoff §1.8 "patrón visual más importante" */}
      {isAd && (
        <div
          className="absolute top-0 right-0 bg-sa-base text-white px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.08em] rounded-bl-sm"
          aria-label="Anuncio pago"
        >
          AD
        </div>
      )}

      {/* Bottom overlay: label + metrics */}
      {(label || metrics?.length) && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6 pointer-events-none">
          {label && <div className="text-white text-[11px] font-medium truncate">{label}</div>}
          {metrics && metrics.length > 0 && (
            <div className="flex gap-2 mt-1">
              {metrics.map((m, i) => (
                <span key={i} className="text-white/90 font-mono tabular-nums text-[10px]">
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </Component>
  );
}
