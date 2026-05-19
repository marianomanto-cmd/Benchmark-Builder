/**
 * <PlatformBadge> — handoff §3.2.
 * Glyphs originales (no logos literales · IP-safe). En producción se pueden
 * reemplazar por logos reales si la licencia lo permite — mantener el cuadrado
 * redondeado de fondo del color de plataforma.
 */

import { cn } from "@/lib/cn";

export type PlatformKey =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "x"
  | "reddit"
  | "mastodon"
  | "bluesky"
  | "web"
  | "meta_ads";

export const PLATFORM_NAMES: Record<PlatformKey, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  x: "X",
  reddit: "Reddit",
  mastodon: "Mastodon",
  bluesky: "Bluesky",
  web: "Web",
  meta_ads: "Meta Ads",
};

export const PLATFORM_COLORS: Record<PlatformKey, string> = {
  instagram: "var(--color-pf-instagram)",
  tiktok: "var(--color-pf-tiktok)",
  youtube: "var(--color-pf-youtube)",
  facebook: "var(--color-pf-facebook)",
  x: "var(--color-pf-x)",
  reddit: "var(--color-pf-reddit)",
  mastodon: "var(--color-pf-mastodon)",
  bluesky: "var(--color-pf-bluesky)",
  web: "var(--color-pf-web)",
  meta_ads: "var(--color-pf-meta-ads)",
};

const Glyph = {
  instagram: (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="17" cy="7" r="0.9" fill="white" stroke="none" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" fill="white">
      <path d="M14 4v9.5a2.8 2.8 0 1 1-2.8-2.8" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M14 4c.6 2 2 3.2 4 3.4" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" fill="white">
      <rect x="3" y="6" width="18" height="12" rx="2.5" fill="white" />
      <path d="m10 9 5 3-5 3z" fill="var(--color-pf-youtube)" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" fill="white">
      <path d="M14 7h2V4h-2.5C12 4 10.5 5 10.5 7v2H8v3h2.5v8h3v-8H16l.5-3H13.5V7.5c0-.3.2-.5.5-.5z" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" stroke="white" strokeWidth="2.5" strokeLinecap="round">
      <path d="m5 5 14 14M19 5 5 19" />
    </svg>
  ),
  reddit: (
    <svg viewBox="0 0 24 24" fill="white">
      <circle cx="12" cy="13" r="7" fill="white" />
      <circle cx="9" cy="13" r="1" fill="var(--color-pf-reddit)" />
      <circle cx="15" cy="13" r="1" fill="var(--color-pf-reddit)" />
      <path d="M9 16c1 1 2 1.4 3 1.4S14 17 15 16" stroke="var(--color-pf-reddit)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="17.5" cy="7.5" r="1.5" fill="white" />
    </svg>
  ),
  mastodon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
      <path d="M5 9c0-3 2-5 7-5s7 2 7 5v5c0 2-1 3-3 3h-2" />
      <path d="M5 9v5c0 2 1 3 3 3h2" />
      <path d="M9 9v4M15 9v4M12 9v4" />
    </svg>
  ),
  bluesky: (
    <svg viewBox="0 0 24 24" fill="white">
      <path d="M12 8c-2-3-6-4-7-3-1 1 0 4 1 5l3 2-3 2c-1 1-2 4-1 5s5 0 7-3c2 3 6 4 7 3 1-1 0-4-1-5l-3-2 3-2c1-1 2-4 1-5s-5 0-7 3z" />
    </svg>
  ),
  web: (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16M12 4c2.5 3 2.5 13 0 16M12 4c-2.5 3-2.5 13 0 16" />
    </svg>
  ),
  meta_ads: (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
      <path d="M3 12c2-5 5-7 8-7s5 2 6 5-1 5-3 5-3-2-4-4-2-4-4-4-3 2-3 5" />
      <text x="12" y="20" textAnchor="middle" fontSize="6" fill="white" stroke="none" fontWeight="700" fontFamily="monospace">AD</text>
    </svg>
  ),
} as const;

const sizePx = { sm: 14, md: 18, lg: 24 };
const wrapSize = { sm: 18, md: 24, lg: 32 };

export interface PlatformBadgeProps {
  platform: PlatformKey;
  size?: "sm" | "md" | "lg";
  label?: boolean;
  className?: string;
}

export function PlatformBadge({ platform, size = "md", label = false, className }: PlatformBadgeProps) {
  const px = sizePx[size];
  const wrap = wrapSize[size];
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className="inline-flex items-center justify-center rounded-[5px]"
        style={{
          width: wrap,
          height: wrap,
          background: PLATFORM_COLORS[platform],
        }}
        aria-label={PLATFORM_NAMES[platform]}
      >
        <span style={{ width: px, height: px, display: "inline-flex" }}>{Glyph[platform]}</span>
      </span>
      {label && <span className="t-small font-medium text-n-700">{PLATFORM_NAMES[platform]}</span>}
    </span>
  );
}
