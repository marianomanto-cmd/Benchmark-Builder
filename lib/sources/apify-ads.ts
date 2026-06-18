import type { Source, SourceQuery, SourceResult, RawMention } from "@/lib/sources/types";
import { env, pickStr } from "@/lib/sources/types";
import type { PlatformKey } from "@/lib/platforms";
import { buildAdInput } from "@/lib/sources/ad-input";
import { runApifyActor } from "@/lib/sources/apify-run";
import { parseRange } from "@/lib/sources/ad-parse";

// Paid ad-library connectors backed by Apify (Meta commercial scraper, Google
// Ads Transparency, LinkedIn / TikTok ad libraries). The actor id is resolved
// per-run from source_settings (DB) → env → case-study catalog, never hardcoded
// here. Each fetch runs ONE Apify run per advertiser (fair share of the result
// limit) so a single prolific advertiser can't crowd out the rest; when no
// advertiser is known it falls back to a keyword-based run. The async run helper
// reports the real cost (usageTotalUsd) and handles large/slow datasets.

function numEnv(name: string, fallback: number): number {
  const v = env(name);
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function uniq(xs: (string | undefined | null)[]): string[] {
  return Array.from(new Set(xs.map((x) => (x ?? "").trim()).filter(Boolean)));
}

// Stable, content-derived id so re-runs upsert the same ad (idempotency) instead
// of inserting duplicates with a random id.
function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function stableAdId(platform: PlatformKey, author: string, text: string, creativeUrl?: string, landingUrl?: string): string {
  return `${platform}:ad:${djb2([author, text, creativeUrl ?? "", landingUrl ?? ""].join("|"))}`;
}

function mapAd(platform: PlatformKey, item: Record<string, unknown>): RawMention | null {
  const idFromItem = pickStr(item, ["id", "adId", "adArchiveId", "adArchiveID", "snapshotId", "url", "adUrl"]);
  const text =
    pickStr(item, ["body", "adText", "creativeBody", "snapshotBody", "text", "title", "headline", "description"]) ?? "";
  const author = pickStr(item, ["advertiser", "pageName", "advertiserName", "name", "company", "companyName"]) ?? "—";
  if (!idFromItem && !text) return null;

  const creativeUrl = pickStr(item, ["imageUrl", "creativeUrl", "thumbnailUrl", "videoUrl", "snapshotUrl"]);
  const landingUrl = pickStr(item, ["landingUrl", "linkUrl", "destinationUrl", "link"]);
  const externalId = idFromItem ?? stableAdId(platform, author, text, creativeUrl, landingUrl);

  const spendRange = pickStr(item, ["spend", "spendRange", "amountSpent"]);
  const impressions = pickStr(item, ["impressions", "impressionsRange"]);
  const spend = parseRange(spendRange);
  const reach = parseRange(impressions);

  return {
    platform,
    externalId,
    author,
    handle: author,
    url: pickStr(item, ["url", "adUrl", "snapshotUrl", "adSnapshotUrl", "link"]),
    publishedAt: pickStr(item, ["startDate", "startedAt", "ad_delivery_start_time", "firstShown", "createdAt"]),
    text: text || "(creativo sin texto)",
    isAd: true,
    thumbType: "ad",
    ad: {
      creativeUrl,
      cta: pickStr(item, ["cta", "ctaText", "callToAction", "ctaType"]),
      landingUrl,
      startedAt: pickStr(item, ["startDate", "startedAt", "ad_delivery_start_time"]),
      activeStatus: pickStr(item, ["status", "activeStatus", "ad_active_status"]),
      adType: pickStr(item, ["adType", "type", "format"]),
      spendRange,
      impressions,
      fundingEntity: pickStr(item, ["fundingEntity", "payer", "byline"]),
      advertiserId: pickStr(item, ["advertiserId", "advertiser_id", "pageId", "page_id"]),
      pageId: pickStr(item, ["pageId", "page_id", "viewAllPageId", "view_all_page_id"]),
      spendMin: spend?.min,
      spendMax: spend?.max,
      impressionsMin: reach?.min,
      impressionsMax: reach?.max,
      currency: spend?.currency,
    },
    engagement: {},
  };
}

type Slice = { advertisers: string[]; pageIds: string[] };

// Build one slice per known advertiser (page id preferred over name), capped so
// the total number of Apify runs — and thus cost — stays bounded. When nothing
// is known, a single keyword-based slice.
function buildSlices(q: SourceQuery, maxAdvertisers: number): Slice[] {
  const idSlices: Slice[] = uniq(q.advertiserIds ?? []).map((id) => ({ advertisers: [], pageIds: [id] }));
  const nameSlices: Slice[] = uniq(q.handles).map((a) => ({ advertisers: [a], pageIds: [] }));
  const slices = [...idSlices, ...nameSlices].slice(0, maxAdvertisers);
  return slices.length ? slices : [{ advertisers: [], pageIds: [] }];
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

      const countries = q.geo.length ? q.geo : ["US"];
      const sinceISO =
        q.sinceDays > 0 ? new Date(Date.now() - q.sinceDays * 86400_000).toISOString().slice(0, 10) : undefined;
      const maxAdvertisers = Math.min(Math.round(numEnv("APIFY_ADS_MAX_ADVERTISERS", 8)), 25);
      const deadlineMs = numEnv("APIFY_ADS_RUN_TIMEOUT_MS", 90_000);

      const slices = buildSlices(q, maxAdvertisers);
      const perSlice = Math.max(5, Math.ceil(q.limit / slices.length));

      let cost = 0;
      const byId = new Map<string, RawMention>();
      for (const slice of slices) {
        if (byId.size >= q.limit) break;
        const input = buildAdInput(actor, {
          advertisers: slice.advertisers,
          pageIds: slice.pageIds,
          keywords: q.keywords,
          countries,
          languages: q.languages,
          limit: perSlice,
          sinceISO,
          activeStatus: "all",
        });
        const run = await runApifyActor({ actor, token, input, limit: perSlice, deadlineMs });
        cost += run.costUsd;
        for (const it of run.items) {
          const m = mapAd(platform, it);
          if (m && !byId.has(m.externalId)) byId.set(m.externalId, m);
        }
      }

      const mentions = Array.from(byId.values()).slice(0, q.limit);
      return { mentions, cost };
    },
  };
}
