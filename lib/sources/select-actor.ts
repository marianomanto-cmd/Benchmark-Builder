import type { PlatformKey } from "@/lib/platforms";
import type { Scope } from "@/lib/sources/types";
import { env } from "@/lib/sources/types";
import type { ResearchPlan } from "@/lib/discovery/schema";

// Automatic capture-method selection.
// ---------------------------------------------------------------------------
// The scraper ("actor") used for each source is NOT configured by the end user.
// For every report it is chosen automatically from a vetted catalog based on the
// case study: platform, scope (organic vs. ads), market/geo and intent. In live
// mode the analysis step can refine this choice; the catalog below is the
// deterministic, zero-cost baseline used in mock mode and as the always-available
// fallback. Ops can still pin a specific actor via env vars.
//
// Precedence:  ops env override  →  case-study catalog  →  (undefined → handled
// upstream by provider default / non-Apify connector).
//
// NOTE: this machinery is internal — it must never be surfaced in the UI.
// See docs/apify-ad-actors.md for the full vetted list and pinning notes.

// Organic profile/feed scrapers, per platform.
const ORGANIC_DEFAULTS: Partial<Record<PlatformKey, string>> = {
  instagram: "apify~instagram-scraper",
  tiktok: "clockworks~tiktok-scraper",
  youtube: "streamers~youtube-scraper",
  facebook: "apify~facebook-posts-scraper",
  x: "apidojo~tweet-scraper",
  web: "apify~google-search-scraper",
};

// Markets where TikTok exposes an official Ads Library API (EU-27 + UK). Outside
// this set the global Creative Center scraper is the better fit.
const TIKTOK_ADS_API_GEO = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
  "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES",
  "SE", "GB",
]);

type PaidEntry = { base: string; regional?: { geo: Set<string>; actor: string } };

// Ad-library / ad-detection scrapers (read ONLY paid creatives, never organic).
const PAID_CATALOG: Partial<Record<PlatformKey, PaidEntry>> = {
  // Instagram + Facebook ads both live in the Meta Ad Library.
  meta_ads: { base: "apify~facebook-ads-scraper" },
  facebook: { base: "apify~facebook-ads-scraper" },
  instagram: { base: "apify~facebook-ads-scraper" },
  google_ads: { base: "lexis-solutions~google-ads-scraper" },
  linkedin_ads: { base: "unseenuser~linkedin-ads" },
  tiktok: {
    base: "coregent~tiktok-ads-library-creative-center-scraper",
    regional: { geo: TIKTOK_ADS_API_GEO, actor: "s-r~tiktok-ads-library" },
  },
};

// Ops-level override (not user-facing). Scope-specific takes priority over the
// platform-wide one, mirroring the connector's historical env lookup.
function envOverride(platform: PlatformKey, scope: Scope): string | undefined {
  const P = platform.toUpperCase();
  return env(`APIFY_ACTOR_${P}_${scope.toUpperCase()}`) ?? env(`APIFY_ACTOR_${P}`);
}

/**
 * Picks the Apify actor for a (platform × scope) given the case study. Returns
 * `undefined` for sources that don't use an Apify actor (e.g. Reddit/Mastodon/
 * Bluesky connectors), in which case the caller leaves `actorId` unset.
 */
export function selectActor(platform: PlatformKey, scope: Scope, plan?: ResearchPlan): string | undefined {
  const override = envOverride(platform, scope);
  if (override) return override;

  if (scope === "paid") {
    const entry = PAID_CATALOG[platform];
    if (!entry) return undefined;
    const geo = (plan?.geo ?? []).map((g) => g.toUpperCase());
    if (entry.regional && geo.some((g) => entry.regional!.geo.has(g))) {
      return entry.regional.actor;
    }
    return entry.base;
  }

  return ORGANIC_DEFAULTS[platform];
}
