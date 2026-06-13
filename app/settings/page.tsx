import { ScreenShell } from "@/components/shell/screen-shell";
import { createClient } from "@/lib/supabase/server";
import { SourceSettingsForm, type SourceSettingVM } from "@/components/source-settings-form";
import { PLATFORMS, type PlatformKey } from "@/lib/platforms";

const APIFY: PlatformKey[] = ["instagram", "tiktok", "youtube", "facebook", "x", "web"];
const DEFAULT_ACTOR: Partial<Record<PlatformKey, string>> = {
  instagram: "apify~instagram-scraper",
  tiktok: "clockworks~tiktok-scraper",
  youtube: "streamers~youtube-scraper",
  facebook: "apify~facebook-posts-scraper",
  x: "apidojo~tweet-scraper",
  web: "apify~google-search-scraper",
};

function buildRows(map: Map<PlatformKey, { actor_id: string | null; enabled: boolean; results_limit: number }>): SourceSettingVM[] {
  return (Object.keys(PLATFORMS) as PlatformKey[]).map((p) => {
    const s = map.get(p);
    return {
      platform: p,
      name: PLATFORMS[p].name,
      actorId: s?.actor_id ?? DEFAULT_ACTOR[p] ?? "",
      enabled: s?.enabled ?? true,
      resultsLimit: s?.results_limit ?? 25,
      usesActor: APIFY.includes(p),
    };
  });
}

export default async function Page() {
  let rows: SourceSettingVM[];
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("source_settings").select("*");
    rows = buildRows(new Map((data ?? []).map((s) => [s.platform as PlatformKey, s])));
  } catch {
    rows = buildRows(new Map());
  }
  return (
    <ScreenShell breadcrumb={["Settings", "Fuentes"]}>
      <SourceSettingsForm initial={rows} />
    </ScreenShell>
  );
}
