import type { Source, SourceQuery, SourceResult, RawMention } from "@/lib/sources/types";
import { getJson } from "@/lib/sources/types";

// Bluesky — public AppView search (no auth).
type Post = {
  uri: string;
  cid: string;
  author: { handle: string; displayName?: string };
  record: { text: string; createdAt: string };
  likeCount?: number;
  repostCount?: number;
  replyCount?: number;
  embed?: { $type?: string };
};

function webUrl(uri: string, handle: string): string {
  const rkey = uri.split("/").pop();
  return `https://bsky.app/profile/${handle}/post/${rkey}`;
}

export const blueskySource: Source = {
  key: "bluesky",
  label: "Bluesky",
  available: () => true,
  async fetch(q: SourceQuery): Promise<SourceResult> {
    const terms = (q.keywords.length ? q.keywords : q.handles).slice(0, 4);
    const mentions: RawMention[] = [];
    for (const term of terms) {
      const url = `https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(term)}&limit=${Math.min(25, q.limit)}`;
      const json = (await getJson(url)) as { posts?: Post[] };
      for (const p of json.posts ?? []) {
        const isVideo = (p.embed?.$type ?? "").includes("video");
        const isImage = (p.embed?.$type ?? "").includes("images");
        mentions.push({
          platform: "bluesky",
          externalId: p.uri,
          author: p.author.displayName || p.author.handle,
          handle: `@${p.author.handle}`,
          url: webUrl(p.uri, p.author.handle),
          publishedAt: p.record.createdAt,
          text: p.record.text,
          engagement: { likes: p.likeCount, shares: p.repostCount, comments: p.replyCount },
          thumbType: isVideo ? "video" : isImage ? "photo" : undefined,
        });
      }
    }
    return { mentions, cost: 0 };
  },
};
