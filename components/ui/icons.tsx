import type { ReactElement } from "react";
import type { PlatformKey } from "@/lib/platforms";

// ============================================================
// Inline icons (Lucide-style, hand-tuned) — port of design/_shared.
// Ic.* are used as components: <Ic.search s={11} />
// ============================================================
type IconProps = { s?: number };

export const Ic = {
  search: ({ s = 14 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="4.2" /><path d="m12 12-2.8-2.8" /></svg>
  ),
  plus: ({ s = 14 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M7 2.5v9M2.5 7h9" /></svg>
  ),
  arrow: ({ s = 14 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h8M7.5 3.5 11 7l-3.5 3.5" /></svg>
  ),
  arrowDown: ({ s = 10 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="m2.5 4 2.5 2.5L7.5 4" /></svg>
  ),
  download: ({ s = 14 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 2v7M4 6l3 3 3-3M2 11.5h10" /></svg>
  ),
  check: ({ s = 10 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m2 5 2 2 4-4" /></svg>
  ),
  alert: ({ s = 14 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1 13 12H1L7 1zM7 5.5v3M7 10.5h.01" /></svg>
  ),
  close: ({ s = 10 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l6 6M8 2l-6 6" /></svg>
  ),
  spinner: ({ s = 12 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="6" cy="6" r="4" opacity=".25" /><path d="M10 6a4 4 0 0 0-4-4"><animateTransform attributeName="transform" type="rotate" from="0 6 6" to="360 6 6" dur="0.9s" repeatCount="indefinite" /></path></svg>
  ),
  empty: ({ s = 18 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="3" y="3" width="12" height="12" rx="1.5" /><path d="M3 7h12M7 3v12" opacity=".5" /></svg>
  ),
  error: ({ s = 18 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="9" cy="9" r="6" /><path d="M9 6v3.5M9 12v.01" /></svg>
  ),
  more: ({ s = 12 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="currentColor"><circle cx="2.5" cy="6" r="1" /><circle cx="6" cy="6" r="1" /><circle cx="9.5" cy="6" r="1" /></svg>
  ),
  filter: ({ s = 14 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M2 3h10M3.5 7h7M5 11h4" /></svg>
  ),
  sort: ({ s = 14 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M4 2v10M2 4l2-2 2 2M10 12V2M8 10l2 2 2-2" /></svg>
  ),
  ext: ({ s = 10 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 1h6v6M9 1 4 6M1 4v5h5" /></svg>
  ),
  trend: ({ s = 10 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M1 7l3-3 2 2 3-3M9 3v2.5M9 3H6.5" /></svg>
  ),
  trendDown: ({ s = 10 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3l3 3 2-2 3 3M9 7V4.5M9 7H6.5" /></svg>
  ),
  copy: ({ s = 12 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1" /><path d="M2 8V2.5h5.5" /></svg>
  ),
  play: ({ s = 10 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 10 10" fill="currentColor"><path d="M3 2v6l5-3z" /></svg>
  ),
  bolt: ({ s = 12 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="currentColor"><path d="M7 1 3 7h3l-1 4 4-6H6l1-4z" /></svg>
  ),
  eye: ({ s = 14 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M1 7s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z" /><circle cx="7" cy="7" r="1.5" /></svg>
  ),
  presentation: ({ s = 14 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><rect x="1.5" y="2" width="11" height="7.5" rx="1" /><path d="M5 12l2-2.5L9 12" /></svg>
  ),
};

// ============================================================
// Sidebar / nav icons — called as functions: NavIc.grid(15)
// ============================================================
export const NavIc = {
  grid: (s = 14): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1" /><rect x="8" y="1.5" width="4.5" height="4.5" rx="1" /><rect x="1.5" y="8" width="4.5" height="4.5" rx="1" /><rect x="8" y="8" width="4.5" height="4.5" rx="1" /></svg>
  ),
  folder: (s = 14): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"><path d="M1.5 4.5V11a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V5.5a1 1 0 0 0-1-1H7L5.5 3h-3a1 1 0 0 0-1 1v.5z" /></svg>
  ),
  users: (s = 14): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="5" cy="5" r="2.2" /><path d="M1.5 12c.5-2 2-3 3.5-3s3 1 3.5 3M9.5 5a2 2 0 1 1 0-2M12.5 11.5c-.4-1.5-1.4-2.4-2.5-2.7" /></svg>
  ),
  doc: (s = 14): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"><path d="M3 1.5h5l3 3V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2.5a1 1 0 0 1 1-1z" /><path d="M8 1.5v3h3M4 7h6M4 9.5h6" /></svg>
  ),
  bulb: (s = 14): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M7 1.5a4 4 0 0 0-2 7.5v1.5h4V9a4 4 0 0 0-2-7.5zM5.5 12.5h3M6 11h2" /></svg>
  ),
  bell: (s = 14): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M3 10.5h8l-1-1.5V6a3 3 0 1 0-6 0v3l-1 1.5zM6 12.5a1 1 0 0 0 2 0" /></svg>
  ),
  cog: (s = 14): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="7" cy="7" r="2" /><path d="M7 1v1.5M7 11.5V13M2 7H.5M13.5 7H12M3.4 3.4l1 1M9.6 9.6l1 1M3.4 10.6l1-1M9.6 4.4l1-1" /></svg>
  ),
};

// ============================================================
// Platform glyphs (abstract marks — original, not literal logos)
// Called as functions: PlatformGlyph.instagram(12)
// ============================================================
export const PlatformGlyph: Partial<Record<PlatformKey, (s?: number) => ReactElement>> = {
  instagram: (s = 12) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="1.5" y="1.5" width="9" height="9" rx="2.5" /><circle cx="6" cy="6" r="2" /><circle cx="8.7" cy="3.3" r=".5" fill="currentColor" /></svg>
  ),
  tiktok: (s = 12) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="currentColor"><path d="M7 1v5.5a2 2 0 1 1-2-2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><path d="M7 1c.3 1.6 1.5 2.6 3 2.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
  ),
  youtube: (s = 12) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="1" y="3" width="10" height="6" rx="1.5" /><path d="m5 4.5 2.5 1.5L5 7.5z" fill="currentColor" /></svg>
  ),
  facebook: (s = 12) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M7 11V6.5h1.5l.3-1.8H7v-1c0-.6.2-1 1-1H9V1h-1.5C6 1 5 2 5 3.5v1.2H3.5v1.8H5V11" /></svg>
  ),
  x: (s = 12) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="m1.5 1.5 9 9M10.5 1.5l-9 9" /></svg>
  ),
  reddit: (s = 12) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="6" cy="7" r="4" /><circle cx="4.5" cy="7" r=".5" fill="currentColor" /><circle cx="7.5" cy="7" r=".5" fill="currentColor" /><path d="M4.5 8.5c.7.5 2.3.5 3 0" strokeLinecap="round" /><circle cx="9.5" cy="3" r="1" /><path d="M6 3 7 1.5h2" strokeLinecap="round" /></svg>
  ),
  mastodon: (s = 12) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 4c0-2 1.5-2.5 4-2.5s4 .5 4 2.5v3a2 2 0 0 1-2 2H6.5L4 11V4" strokeLinejoin="round" /><path d="M5 4v3M7 4v3" strokeLinecap="round" /></svg>
  ),
  bluesky: (s = 12) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="currentColor"><path d="M6 4.5C5 2.5 3.5 1 2 1v6.5c0 1.5 2 2 4 2s4-.5 4-2V1c-1.5 0-3 1.5-4 3.5z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
  ),
  web: (s = 12) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="6" cy="6" r="4.5" /><path d="M1.5 6h9M6 1.5c1.5 1.5 2 3 2 4.5s-.5 3-2 4.5C4.5 9 4 7.5 4 6s.5-3 2-4.5z" /></svg>
  ),
  meta_ads: (s = 12) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M1.5 6c0-2 1.4-3 3-3 1.6 0 2.5 1.5 3.5 3s1.6 3 3 3c-.6-2-1.5-6-3-6-1.4 0-2.4 1.5-3.5 3s-2 3-3 3z" /></svg>
  ),
};
