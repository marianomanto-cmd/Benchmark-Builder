import type { Source, SourceQuery, SourceResult, RawMention } from "@/lib/sources/types";
import { getJson } from "@/lib/sources/types";

// Reddit — public search JSON (no auth needed for read; rate-limited).
type RedditChild = {
  data: {
    id: string;
    author: string;
    subreddit_name_prefixed?: string;
    permalink: string;
    title: string;
    selftext?: string;
    created_utc: number;
    ups?: number;
    num_comments?: number;
    is_video?: boolean;
    post_hint?: string;
  };
};

export const redditSource: Source = {
  key: "reddit",
  label: "Reddit",
  available: () => true,
  async fetch(q: SourceQuery): Promise<SourceResult> {
    const terms = (q.keywords.length ? q.keywords : q.handles).slice(0, 4);
    const mentions: RawMention[] = [];
    for (const term of terms) {
      const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(term)}&sort=new&limit=${Math.min(25, q.limit)}`;
      const json = (await getJson(url)) as { data?: { children?: RedditChild[] } };
      for (const c of json.data?.children ?? []) {
        const d = c.data;
        mentions.push({
          platform: "reddit",
          externalId: d.id,
          author: d.subreddit_name_prefixed ?? `u/${d.author}`,
          handle: `u/${d.author}`,
          url: `https://www.reddit.com${d.permalink}`,
          publishedAt: new Date(d.created_utc * 1000).toISOString(),
          text: d.selftext ? `${d.title} — ${d.selftext}` : d.title,
          engagement: { likes: d.ups, comments: d.num_comments },
          thumbType: d.is_video ? "video" : d.post_hint === "image" ? "photo" : "article",
        });
      }
    }
    return { mentions, cost: 0 };
  },
};
