// Platform registry — HANDOFF §2.1 / §3.2.
// Colors are dataviz/branding only (PlatformBadge), never used for brand comparison charts.

export const PLATFORM_KEYS = [
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "x",
  "reddit",
  "mastodon",
  "bluesky",
  "web",
  "meta_ads",
  "google_ads",
  "linkedin_ads",
] as const;

export type PlatformKey = (typeof PLATFORM_KEYS)[number];

export type PlatformMeta = {
  name: string;
  short: string;
  color: string;
};

export const PLATFORMS: Record<PlatformKey, PlatformMeta> = {
  instagram: { name: "Instagram", short: "IG", color: "#c13584" },
  tiktok: { name: "TikTok", short: "TT", color: "#111111" },
  youtube: { name: "YouTube", short: "YT", color: "#c4302b" },
  facebook: { name: "Facebook", short: "FB", color: "#1877f2" },
  x: { name: "X / Grok", short: "X", color: "#0f0f0f" },
  reddit: { name: "Reddit", short: "RD", color: "#ff4500" },
  mastodon: { name: "Mastodon", short: "MS", color: "#6364ff" },
  bluesky: { name: "Bluesky", short: "BS", color: "#1083fe" },
  web: { name: "Web", short: "WB", color: "#6b6b6b" },
  meta_ads: { name: "Meta Ads", short: "AD", color: "#4267b2" },
  google_ads: { name: "Google Ads", short: "GA", color: "#34a853" },
  linkedin_ads: { name: "LinkedIn Ads", short: "LI", color: "#0a66c2" },
};

export type SentimentKind = "pos" | "neu" | "neg" | "mix";
export type ThumbKind = "photo" | "video" | "article" | "ad";
export type InsightKind = "opp" | "thr" | "pat" | "ano";
