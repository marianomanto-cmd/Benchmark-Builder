import type { PlatformKey } from "@/lib/platforms";
import type { Scope } from "@/lib/sources/types";
import { selectActor } from "@/lib/sources/select-actor";
import type { ResearchPlan } from "./schema";

// One extraction job per (platform × scope). The capture method (actor) is NOT
// user-configured: it's selected automatically per case study (selectActor).
// A legacy/ops actor_id pinned in source_settings still wins if present.
export type ExtractionJob = {
  platform: PlatformKey;
  scope: Scope;
  provider: string; // apify | grok | meta_api | reddit | mastodon | bluesky | web
  actorId?: string;
  fallbackActorId?: string;
  items: number;
  political: boolean;
};

export type SettingRow = {
  platform: PlatformKey;
  scope: string;
  provider: string | null;
  actor_id: string | null;
  fallback_actor_id: string | null;
  enabled: boolean;
  results_limit: number;
};

// Turns a ResearchPlan + the source_settings registry into the list of jobs to
// run. Honors the chosen scope (organic/paid/both) and per-source enable flags.
export function planToJobs(plan: ResearchPlan, settings: SettingRow[], maxItems = 100): ExtractionJob[] {
  const includeOrganic = plan.scope !== "paid";
  const includePaid = plan.scope !== "organic";
  const wanted = new Set<PlatformKey>(plan.platforms);
  const political = plan.ad_intent !== "commercial";

  const jobs: ExtractionJob[] = [];
  for (const row of settings) {
    if (!row.enabled) continue;
    if (!wanted.has(row.platform)) continue;
    if (row.scope === "organic" && !includeOrganic) continue;
    if (row.scope === "paid" && !includePaid) continue;
    jobs.push({
      platform: row.platform,
      scope: row.scope as Scope,
      provider: row.provider ?? "apify",
      actorId: row.actor_id ?? selectActor(row.platform, row.scope as Scope, plan),
      fallbackActorId: row.fallback_actor_id ?? undefined,
      items: Math.min(row.results_limit ?? 25, maxItems),
      political,
    });
  }
  return jobs;
}
