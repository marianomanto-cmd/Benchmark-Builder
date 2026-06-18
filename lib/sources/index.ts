import type { PlatformKey } from "@/lib/platforms";
import type { Source, Scope } from "@/lib/sources/types";
import { redditSource } from "@/lib/sources/reddit";
import { mastodonSource } from "@/lib/sources/mastodon";
import { blueskySource } from "@/lib/sources/bluesky";
import { metaAdsSource } from "@/lib/sources/meta-ads";
import { grokLiveSource } from "@/lib/sources/grok-live";
import { apifySource } from "@/lib/sources/apify";
import { paidAdsSource } from "@/lib/sources/apify-ads";

// Organic feed adapters. Apify backs the scraped social platforms; Reddit/
// Mastodon/Bluesky use public APIs; X and Web/Portales use Grok live search
// (Grok lee X y hace búsqueda web+prensa independiente).
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
  x: grokLiveSource("x"),
  web: grokLiveSource("web"),
};

// Paid (ad library) adapters. Meta commercial (meta_ads + Instagram/Facebook ad
// scopes) uses the Apify Ad Library scraper; Google/LinkedIn/TikTok use their
// respective ad-library actors. The official Meta API (meta-ads.ts) is the
// political route, selected in the runner.
// X has NO public ad library, so there is no paid X adapter — paid X used to
// return organic conversation via Grok, which mislabeled it as advertising.
// (source_settings x:paid is disabled in migration 20260618120000.)
const PAID: Partial<Record<PlatformKey, Source>> = {
  meta_ads: paidAdsSource("meta_ads"),
  instagram: paidAdsSource("instagram"),
  facebook: paidAdsSource("facebook"),
  tiktok: paidAdsSource("tiktok"),
  google_ads: paidAdsSource("google_ads"),
  linkedin_ads: paidAdsSource("linkedin_ads"),
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
