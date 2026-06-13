import type { PlatformKey } from "@/lib/platforms";
import type { Source, Scope } from "@/lib/sources/types";
import { redditSource } from "@/lib/sources/reddit";
import { mastodonSource } from "@/lib/sources/mastodon";
import { blueskySource } from "@/lib/sources/bluesky";
import { metaAdsSource } from "@/lib/sources/meta-ads";
import { grokXSource } from "@/lib/sources/grok-x";
import { apifySource } from "@/lib/sources/apify";
import { paidAdsSource } from "@/lib/sources/apify-ads";

// Organic feed adapters. Apify backs the scraped platforms; Reddit/Mastodon/
// Bluesky use public APIs; X uses Grok live search.
const ORGANIC: Record<PlatformKey, Source | undefined> = {
  reddit: redditSource,
  mastodon: mastodonSource,
  bluesky: blueskySource,
  meta_ads: undefined, // meta_ads is paid-only
  google_ads: undefined,
  linkedin_ads: undefined,
  instagram: apifySource("instagram"),
  tiktok: apifySource("tiktok"),
  youtube: apifySource("youtube"),
  facebook: apifySource("facebook"),
  x: grokXSource,
  web: apifySource("web"),
};

// Paid (ad library) adapters. Meta commercial uses the Apify scraper; the
// official API (meta-ads.ts) is the political route, selected in the runner.
// X has no public ad library → Grok.
const PAID: Partial<Record<PlatformKey, Source>> = {
  meta_ads: paidAdsSource("meta_ads"),
  google_ads: paidAdsSource("google_ads"),
  linkedin_ads: paidAdsSource("linkedin_ads"),
  x: grokXSource,
};

// Resolve the adapter for a (platform, scope). For paid Meta with political
// intent, the runner additionally calls metaAdsOfficial().
export function sourceFor(platform: PlatformKey, scope: Scope = "organic"): Source | undefined {
  return scope === "paid" ? PAID[platform] : ORGANIC[platform];
}

// Official Meta Ad Library API (ads_archive) — political routing only.
export const metaAdsOfficial = metaAdsSource;

export function allSources(): Source[] {
  return Object.values(ORGANIC).filter((s): s is Source => s != null);
}
