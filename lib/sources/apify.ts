import type { Source, SourceQuery, SourceResult, RawMention } from "@/lib/sources/types";
import { env, pickStr, pickNum } from "@/lib/sources/types";
import type { PlatformKey, ThumbKind } from "@/lib/platforms";

// Apify-backed sources (Instagram, TikTok, X, YouTube, Facebook, Web).
// Actor ids are overridable per platform via APIFY_ACTOR_<PLATFORM>.
const DEFAULT_ACTORS: Partial<Record<PlatformKey, string>> = {
  instagram: "apify~instagram-scraper",
  tiktok: "clockworks~tiktok-scraper",
  youtube: "streamers~youtube-scraper",
  facebook: "apify~facebook-posts-scraper",
  x: "apidojo~tweet-scraper",
  web: "apify~google-search-scraper",
};

function actorFor(p: PlatformKey): string {
  return env(`APIFY_ACTOR_${p.toUpperCase()}`) ?? DEFAULT_ACTORS[p] ?? "";
}

// Best-effort input shape covering common actor schemas. Tune per actor as needed.
function buildInput(q: SourceQuery): Record<string, unknown> {
  const terms = q.keywords.length ? q.keywords : q.handles;
  return {
    search: terms.join(" "),
    searchQueries: terms,
    queries: terms.join("\n"),
    keywords: terms,
    usernames: q.handles,
    profiles: q.handles,
    handles: q.handles,
    resultsLimit: q.limit,
    maxItems: q.limit,
    maxResults: q.limit,
    resultsPerPage: q.limit,
  };
}

function inferThumb(item: Record<string, unknown>): ThumbKind | undefined {
  const type = pickStr(item, ["type", "mediaType", "videoType"]);
  if (type && /video/i.test(type)) return "video";
  if (pickNum(item, ["videoViewCount", "playCount", "viewCount"]) != null) return "video";
  if (pickStr(item, ["displayUrl", "imageUrl", "thumbnailUrl"])) return "photo";
  return undefined;
}

function mapItem(p: PlatformKey, item: Record<string, unknown>): RawMention | null {
  const externalId =
    pickStr(item, ["id", "postId", "tweetId", "videoId", "shortCode", "url", "postUrl"]) ?? null;
  const text =
    pickStr(item, ["caption", "text", "title", "description", "content", "snippet", "fullText"]) ?? "";
  if (!externalId && !text) return null;
  const handle = pickStr(item, ["ownerUsername", "username", "authorUsername", "handle", "channelName"]);
  const author =
    pickStr(item, ["ownerFullName", "authorName", "author", "name", "channelName"]) ?? handle ?? "—";
  return {
    platform: p,
    externalId: externalId ?? `${p}:${Math.random().toString(36).slice(2)}`,
    author,
    handle: handle ? `@${handle.replace(/^@/, "")}` : author,
    url: pickStr(item, ["url", "postUrl", "link", "tweetUrl"]),
    publishedAt: pickStr(item, ["timestamp", "createdAt", "date", "publishedAt", "created_at", "uploadDate"]),
    text,
    engagement: {
      likes: pickNum(item, ["likesCount", "likes", "diggCount", "favoriteCount", "reactionsCount"]),
      comments: pickNum(item, ["commentsCount", "comments", "replyCount", "repliesCount"]),
      shares: pickNum(item, ["sharesCount", "shareCount", "retweetCount", "reshareCount"]),
      views: pickNum(item, ["videoViewCount", "viewCount", "playCount", "views"]),
    },
    thumbType: inferThumb(item),
  };
}

export function apifySource(platform: PlatformKey): Source {
  return {
    key: platform,
    label: `Apify · ${platform}`,
    available: () => Boolean(env("APIFY_TOKEN") && actorFor(platform)),
    async fetch(q: SourceQuery): Promise<SourceResult> {
      const token = env("APIFY_TOKEN");
      const actor = actorFor(platform);
      if (!token || !actor) throw new Error("Apify no configurado (APIFY_TOKEN / actor)");
      const url = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${token}&timeout=180`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildInput(q)),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Apify ${res.status} — ${body.slice(0, 200)}`);
      }
      const items = (await res.json()) as Record<string, unknown>[];
      const mentions = items
        .slice(0, q.limit)
        .map((it) => mapItem(platform, it))
        .filter((m): m is RawMention => m !== null);
      return { mentions, cost: 0 };
    },
  };
}
