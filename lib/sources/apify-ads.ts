import type { Source, SourceQuery, SourceResult, RawMention } from "@/lib/sources/types";
import { env, pickStr } from "@/lib/sources/types";
import type { PlatformKey } from "@/lib/platforms";

// Paid ad-library connectors backed by Apify (Meta commercial scraper, Google Ads
// Transparency, LinkedIn Ad Library). The actor id is resolved per-run from
// source_settings (DB) → env → default, never hardcoded here. Community actors
// vary in schema, so mapping is best-effort + permissive; the runner applies the
// schema-drift / fallback policy on top.

function buildAdInput(q: SourceQuery): Record<string, unknown> {
  const terms = q.keywords.length ? q.keywords : q.handles;
  const countries = q.geo.length ? q.geo : ["US"];
  return {
    // cover the common input keys across ad-library actors
    searchTerms: terms,
    search: terms.join(" "),
    queries: terms,
    keywords: terms,
    advertisers: q.handles,
    pageIds: q.handles,
    countryCode: countries[0],
    countries,
    country: countries[0],
    adType: "all",
    activeStatus: "all",
    count: q.limit,
    maxItems: q.limit,
    resultsLimit: q.limit,
  };
}

function mapAd(platform: PlatformKey, item: Record<string, unknown>): RawMention | null {
  const externalId =
    pickStr(item, ["id", "adId", "adArchiveId", "adArchiveID", "snapshotId", "url", "adUrl"]) ?? null;
  const text =
    pickStr(item, ["body", "adText", "creativeBody", "snapshotBody", "text", "title", "headline", "description"]) ?? "";
  if (!externalId && !text) return null;
  const author = pickStr(item, ["advertiser", "pageName", "advertiserName", "name", "company", "companyName"]) ?? "—";
  return {
    platform,
    externalId: externalId ?? `${platform}:${Math.random().toString(36).slice(2)}`,
    author,
    handle: author,
    url: pickStr(item, ["url", "adUrl", "snapshotUrl", "adSnapshotUrl", "link"]),
    publishedAt: pickStr(item, ["startDate", "startedAt", "ad_delivery_start_time", "firstShown", "createdAt"]),
    text: text || "(creativo sin texto)",
    isAd: true,
    thumbType: "ad",
    ad: {
      creativeUrl: pickStr(item, ["imageUrl", "creativeUrl", "thumbnailUrl", "videoUrl", "snapshotUrl"]),
      cta: pickStr(item, ["cta", "ctaText", "callToAction", "ctaType"]),
      landingUrl: pickStr(item, ["landingUrl", "linkUrl", "destinationUrl", "link"]),
      startedAt: pickStr(item, ["startDate", "startedAt", "ad_delivery_start_time"]),
      activeStatus: pickStr(item, ["status", "activeStatus", "ad_active_status"]),
      adType: pickStr(item, ["adType", "type", "format"]),
      spendRange: pickStr(item, ["spend", "spendRange", "amountSpent"]),
      impressions: pickStr(item, ["impressions", "impressionsRange"]),
      fundingEntity: pickStr(item, ["fundingEntity", "payer", "byline"]),
    },
    engagement: {},
  };
}

export function paidAdsSource(platform: PlatformKey): Source {
  return {
    key: platform,
    label: `Apify Ads · ${platform}`,
    available: () => Boolean(env("APIFY_TOKEN")),
    async fetch(q: SourceQuery): Promise<SourceResult> {
      const token = env("APIFY_TOKEN");
      const actor = q.actorId;
      if (!token || !actor) throw new Error("Apify Ads no configurado (APIFY_TOKEN / actor)");
      const url = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${token}&timeout=180`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildAdInput(q)),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Apify Ads ${res.status} — ${body.slice(0, 200)}`);
      }
      const items = (await res.json()) as Record<string, unknown>[];
      const mentions = items
        .slice(0, q.limit)
        .map((it) => mapAd(platform, it))
        .filter((m): m is RawMention => m !== null);
      return { mentions, cost: 0 };
    },
  };
}
