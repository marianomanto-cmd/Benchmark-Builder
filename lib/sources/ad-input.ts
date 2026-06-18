// Per-actor input profiles for paid ad-library scrapers. Community ad actors
// vary a lot in their accepted input keys, so instead of one "shotgun" object
// with every possible key (which can make stricter actors error), we tailor the
// input by actor *family*, inferred from the actor slug. Each profile:
//   - prefers advertiser / page-id targeting when known, else keyword search
//     (ad libraries expect ONE of those, not both at once);
//   - passes the date window + geo + a per-call limit.
// Still best-effort — validate + pin the exact build per actor before live use
// (see docs/apify-ad-actors.md).

export type AdActorFamily = "meta" | "google" | "linkedin" | "tiktok" | "generic";

export function actorFamily(actor: string): AdActorFamily {
  const a = actor.toLowerCase();
  if (a.includes("linkedin")) return "linkedin";
  if (a.includes("tiktok")) return "tiktok";
  if (a.includes("google")) return "google";
  if (a.includes("facebook") || a.includes("meta")) return "meta";
  return "generic";
}

export type AdInputCtx = {
  advertisers: string[]; // page / advertiser names for this slice
  pageIds: string[]; // numeric page / advertiser ids if known (preferred)
  keywords: string[]; // fallback when no advertiser is known
  countries: string[]; // ISO country codes
  languages: string[];
  limit: number; // per-call result cap
  sinceISO?: string; // ad_delivery_date_min (YYYY-MM-DD)
  activeStatus: "all" | "active";
};

// Meta Ad Library (Instagram + Facebook share it). Prefers page ids, then
// advertiser names, then keywords.
function metaInput(ctx: AdInputCtx): Record<string, unknown> {
  const country = ctx.countries[0] ?? "US";
  const base: Record<string, unknown> = {
    activeStatus: ctx.activeStatus,
    adActiveStatus: ctx.activeStatus,
    adType: "all",
    country,
    countryCode: country,
    countries: ctx.countries,
    count: ctx.limit,
    maxItems: ctx.limit,
    scrapeAdDetails: true,
  };
  if (ctx.sinceISO) {
    base.startDate = ctx.sinceISO;
    base.adDeliveryDateMin = ctx.sinceISO;
  }
  if (ctx.pageIds.length) {
    base.pageIds = ctx.pageIds;
    base.searchPageIds = ctx.pageIds;
  } else if (ctx.advertisers.length) {
    base.searchTerms = ctx.advertisers;
    base.search = ctx.advertisers.join(" ");
  } else {
    base.searchTerms = ctx.keywords;
    base.search = ctx.keywords.join(" ");
  }
  return base;
}

// Google Ads Transparency Center. Searches by advertiser/domain/id or keyword,
// across many regions.
function googleInput(ctx: AdInputCtx): Record<string, unknown> {
  const base: Record<string, unknown> = {
    region: ctx.countries[0] ?? "anywhere",
    countries: ctx.countries,
    count: ctx.limit,
    maxItems: ctx.limit,
  };
  if (ctx.sinceISO) base.startDate = ctx.sinceISO;
  if (ctx.pageIds.length) base.advertiserIds = ctx.pageIds;
  if (ctx.advertisers.length) {
    base.advertiserNames = ctx.advertisers;
    base.searchTerms = ctx.advertisers;
  } else if (!ctx.pageIds.length) {
    base.searchTerms = ctx.keywords;
  }
  return base;
}

// LinkedIn Ad Library.
function linkedinInput(ctx: AdInputCtx): Record<string, unknown> {
  const base: Record<string, unknown> = {
    countries: ctx.countries,
    count: ctx.limit,
    maxItems: ctx.limit,
  };
  if (ctx.sinceISO) base.startDate = ctx.sinceISO;
  if (ctx.pageIds.length) base.companyIds = ctx.pageIds;
  if (ctx.advertisers.length) base.companyNames = ctx.advertisers;
  else if (!ctx.pageIds.length) base.keywords = ctx.keywords;
  return base;
}

// TikTok Ads Library / Creative Center.
function tiktokInput(ctx: AdInputCtx): Record<string, unknown> {
  const country = ctx.countries[0] ?? "US";
  const base: Record<string, unknown> = {
    region: country,
    country,
    limit: ctx.limit,
    maxItems: ctx.limit,
    period: "30",
  };
  if (ctx.advertisers.length) base.advertisers = ctx.advertisers;
  else base.keywords = ctx.keywords;
  return base;
}

// Unknown actor: a leaner superset than the old shotgun (no required keys
// guessed), preferring advertiser terms over keywords.
function genericInput(ctx: AdInputCtx): Record<string, unknown> {
  const terms = ctx.advertisers.length ? ctx.advertisers : ctx.keywords;
  const country = ctx.countries[0] ?? "US";
  const base: Record<string, unknown> = {
    searchTerms: terms,
    search: terms.join(" "),
    keywords: terms,
    countries: ctx.countries,
    country,
    countryCode: country,
    activeStatus: ctx.activeStatus,
    adType: "all",
    count: ctx.limit,
    maxItems: ctx.limit,
    resultsLimit: ctx.limit,
  };
  if (ctx.pageIds.length) base.pageIds = ctx.pageIds;
  if (ctx.sinceISO) base.startDate = ctx.sinceISO;
  return base;
}

export function buildAdInput(actor: string, ctx: AdInputCtx): Record<string, unknown> {
  switch (actorFamily(actor)) {
    case "meta":
      return metaInput(ctx);
    case "google":
      return googleInput(ctx);
    case "linkedin":
      return linkedinInput(ctx);
    case "tiktok":
      return tiktokInput(ctx);
    default:
      return genericInput(ctx);
  }
}
