import type { PlatformKey } from "@/lib/platforms";
import type { Source } from "@/lib/sources/types";
import { redditSource } from "@/lib/sources/reddit";
import { mastodonSource } from "@/lib/sources/mastodon";
import { blueskySource } from "@/lib/sources/bluesky";
import { metaAdsSource } from "@/lib/sources/meta-ads";
import { grokXSource } from "@/lib/sources/grok-x";
import { apifySource } from "@/lib/sources/apify";

// Platform -> source adapter. Apify backs the platforms that require scraping;
// Reddit/Mastodon/Bluesky use public APIs; Meta Ad Library uses the official API.
const REGISTRY: Record<PlatformKey, Source> = {
  reddit: redditSource,
  mastodon: mastodonSource,
  bluesky: blueskySource,
  meta_ads: metaAdsSource,
  instagram: apifySource("instagram"),
  tiktok: apifySource("tiktok"),
  youtube: apifySource("youtube"),
  facebook: apifySource("facebook"),
  x: grokXSource,
  web: apifySource("web"),
};

export function sourceFor(platform: PlatformKey): Source {
  return REGISTRY[platform];
}

export function allSources(): Source[] {
  return Object.values(REGISTRY);
}
