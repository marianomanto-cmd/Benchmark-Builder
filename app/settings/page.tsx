import { ScreenShell } from "@/components/shell/screen-shell";
import { createClient } from "@/lib/supabase/server";
import { SourceSettingsForm, type SourceSettingVM } from "@/components/source-settings-form";
import { BrandingForm } from "@/components/branding-form";
import { getBranding } from "@/lib/branding-server";
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
    enabled: r.enabled,
    resultsLimit: r.results_limit ?? 25,
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
  const branding = await getBranding();
  return (
    <ScreenShell breadcrumb={["@nav.dashboard", "@settings.title"]} nav="app">
      <BrandingForm initial={branding} />
      <SourceSettingsForm initial={rows} />
    </ScreenShell>
  );
}
