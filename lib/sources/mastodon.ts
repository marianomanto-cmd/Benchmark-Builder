import type { Source, SourceQuery, SourceResult, RawMention } from "@/lib/sources/types";
import { getJson, env, stripHtml } from "@/lib/sources/types";

// Mastodon — public hashtag timelines (no auth on most instances).
type Status = {
  id: string;
  url?: string;
  uri: string;
  content: string;
  created_at: string;
  favourites_count?: number;
  reblogs_count?: number;
  replies_count?: number;
  account: { username: string; acct: string; display_name?: string };
  media_attachments?: { type: string }[];
};

export const mastodonSource: Source = {
  key: "mastodon",
  label: "Mastodon",
  available: () => true,
  async fetch(q: SourceQuery): Promise<SourceResult> {
    const instance = env("MASTODON_INSTANCE") ?? "mastodon.social";
    const tags = (q.keywords.length ? q.keywords : q.handles)
      .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ""))
      .filter(Boolean)
      .slice(0, 4);
    const mentions: RawMention[] = [];
    for (const tag of tags) {
      const url = `https://${instance}/api/v1/timelines/tag/${encodeURIComponent(tag)}?limit=${Math.min(20, q.limit)}`;
      const list = (await getJson(url)) as Status[];
      for (const s of list) {
        const hasVideo = (s.media_attachments ?? []).some((m) => m.type === "video" || m.type === "gifv");
        mentions.push({
          platform: "mastodon",
          externalId: s.id,
          author: s.account.display_name || s.account.username,
          handle: `@${s.account.acct}`,
          url: s.url ?? s.uri,
          publishedAt: s.created_at,
          text: stripHtml(s.content),
          engagement: { likes: s.favourites_count, shares: s.reblogs_count, comments: s.replies_count },
          thumbType: (s.media_attachments?.length ?? 0) > 0 ? (hasVideo ? "video" : "photo") : undefined,
        });
      }
    }
    return { mentions, cost: 0 };
  },
};
