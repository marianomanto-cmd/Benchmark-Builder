import type { Source, SourceQuery, SourceResult, RawMention } from "@/lib/sources/types";
import { env, getJson } from "@/lib/sources/types";

// Meta Ad Library — official Graph API (ads_archive).
type Ad = {
  id: string;
  page_name?: string;
  ad_creative_bodies?: string[];
  ad_creative_link_titles?: string[];
  ad_delivery_start_time?: string;
  ad_snapshot_url?: string;
};

export const metaAdsSource: Source = {
  key: "meta_ads",
  label: "Meta Ad Library",
  available: () => Boolean(env("META_AD_LIBRARY_TOKEN")),
  async fetch(q: SourceQuery): Promise<SourceResult> {
    const token = env("META_AD_LIBRARY_TOKEN");
    if (!token) throw new Error("META_AD_LIBRARY_TOKEN no configurado");
    const countries = q.geo.length ? q.geo : ["CO"];
    const terms = (q.keywords.length ? q.keywords : q.handles).slice(0, 4);
    const fields = "id,page_name,ad_creative_bodies,ad_creative_link_titles,ad_delivery_start_time,ad_snapshot_url";
    const mentions: RawMention[] = [];
    for (const term of terms) {
      const url =
        `https://graph.facebook.com/v19.0/ads_archive?access_token=${token}` +
        `&search_terms=${encodeURIComponent(term)}` +
        `&ad_reached_countries=${encodeURIComponent(JSON.stringify(countries))}` +
        `&ad_type=ALL&ad_active_status=ALL&limit=${Math.min(25, q.limit)}&fields=${fields}`;
      const json = (await getJson(url)) as { data?: Ad[] };
      for (const a of json.data ?? []) {
        const body = [...(a.ad_creative_bodies ?? []), ...(a.ad_creative_link_titles ?? [])].join(" / ");
        mentions.push({
          platform: "meta_ads",
          externalId: a.id,
          author: a.page_name ?? "—",
          handle: a.page_name ?? "—",
          url: a.ad_snapshot_url,
          publishedAt: a.ad_delivery_start_time,
          text: body || "(creativo sin texto)",
          isAd: true,
          thumbType: "ad",
          engagement: {},
        });
      }
    }
    return { mentions, cost: 0 };
  },
};
