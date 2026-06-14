import { SiteNav } from "@/components/marketing/site-nav";
import { PortalHero, type RunSummary } from "@/components/screens/portal-hero";
import { CompactDashboard } from "@/components/screens/compact-dashboard";
import { SiteFooter } from "@/components/marketing/site-footer";

// Logged-in home: hero with the prompt box (start a new run) + a compact view of
// the user's accounts dashboard (full view at /dashboard).
export function AppHome({ runs }: { runs: RunSummary[] }) {
  return (
    <main style={{ background: "transparent", color: "var(--text)", overflowX: "hidden", position: "relative" }}>
      <SiteNav />
      <PortalHero runs={runs} />
      <CompactDashboard />
      <SiteFooter />
    </main>
  );
}
