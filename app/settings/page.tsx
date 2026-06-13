import { ScreenShell } from "@/components/shell/screen-shell";
import { createClient } from "@/lib/supabase/server";
import { SourceSettingsForm, type SourceSettingVM } from "@/components/source-settings-form";
import { PLATFORMS, type PlatformKey } from "@/lib/platforms";

type DbRow = {
  platform: PlatformKey;
  scope: string;
  provider: string | null;
  actor_id: string | null;
  enabled: boolean;
  results_limit: number;
};

function toVM(r: DbRow): SourceSettingVM {
  const scope = r.scope === "paid" ? "paid" : "organic";
  const provider = r.provider ?? "apify";
  return {
    platform: r.platform,
    scope,
    provider,
    name: PLATFORMS[r.platform]?.name ?? r.platform,
    actorId: r.actor_id ?? "",
    enabled: r.enabled,
    resultsLimit: r.results_limit ?? 25,
    usesActor: provider === "apify", // only Apify rows expose an editable actor id
  };
}

export default async function Page() {
  let rows: SourceSettingVM[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("source_settings").select("*");
    rows = ((data ?? []) as DbRow[])
      .map(toVM)
      // organic first, then paid; stable by platform name within a scope.
      .sort((a, b) => (a.scope === b.scope ? a.name.localeCompare(b.name) : a.scope === "organic" ? -1 : 1));
  } catch {
    rows = [];
  }
  return (
    <ScreenShell breadcrumb={["Settings", "Fuentes"]}>
      <SourceSettingsForm initial={rows} />
    </ScreenShell>
  );
}
