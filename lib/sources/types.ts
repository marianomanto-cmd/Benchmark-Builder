import type { PlatformKey, ThumbKind } from "@/lib/platforms";

// A normalized mention emitted by any source adapter.
export type RawMention = {
  platform: PlatformKey;
  externalId: string;
  author: string;
  handle: string;
  url?: string;
  publishedAt?: string; // ISO
  text: string;
  isAd?: boolean;
  thumbType?: ThumbKind;
  engagement?: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
    reach?: number;
  };
};

export type SourceQuery = {
  platform: PlatformKey;
  handles: string[]; // competitor handles / target accounts
  keywords: string[]; // project keywords
  languages: string[];
  geo: string[]; // ISO country codes
  sinceDays: number;
  limit: number;
};

export type SourceResult = { mentions: RawMention[]; cost: number };

export interface Source {
  key: PlatformKey;
  label: string;
  /** Whether the required credentials/config are present. */
  available(): boolean;
  fetch(q: SourceQuery): Promise<SourceResult>;
}

// ---- helpers shared by adapters ----

export function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

export function pickStr(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.length > 0) return v;
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

export function pickNum(obj: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  }
  return undefined;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

// Relative time label in es-AR ("hace 4 h", "hace 2 d").
export function relativeTime(iso?: string): string {
  if (!iso) return "reciente";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "reciente";
  const diff = Math.max(0, Date.now() - then);
  const min = Math.round(diff / 60000);
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} d`;
}

export async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    headers: { "User-Agent": "benchmark-builder/0.1", Accept: "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} — ${body.slice(0, 200)}`);
  }
  return res.json();
}
