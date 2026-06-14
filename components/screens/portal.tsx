import { SiteNav } from "@/components/marketing/site-nav";
import { PortalHero, type RunSummary } from "@/components/screens/portal-hero";
import { SourcesMarquee } from "@/components/marketing/sources-marquee";
import { WhatItDoes } from "@/components/marketing/what-it-does";
import { Process } from "@/components/marketing/process";
import { Deliverable } from "@/components/marketing/deliverable";
import { Testimonials } from "@/components/marketing/testimonials";
import { Faq } from "@/components/marketing/faq";
import { SiteFooter } from "@/components/marketing/site-footer";

export type { RunSummary };

export function Portal({ runs }: { runs: RunSummary[] }) {
  return (
    <main style={{ background: "transparent", color: "var(--text)", overflowX: "hidden", position: "relative" }}>
      <SiteNav />
      <PortalHero runs={runs} />
      <SourcesMarquee />
      <WhatItDoes />
      <Process />
      <Deliverable />
      <Testimonials />
      <Faq />
      <SiteFooter />
    </main>
  );
}
