import { SiteNav } from "@/components/marketing/site-nav";
import { MarketingHero } from "@/components/screens/marketing-hero";
import { SourcesMarquee } from "@/components/marketing/sources-marquee";
import { WhatItDoes } from "@/components/marketing/what-it-does";
import { Process } from "@/components/marketing/process";
import { Deliverable } from "@/components/marketing/deliverable";
import { Testimonials } from "@/components/marketing/testimonials";
import { Faq } from "@/components/marketing/faq";
import { SiteFooter } from "@/components/marketing/site-footer";

// Logged-out marketing home: hooks + CTA hero (no prompt box) + the pitch.
export function MarketingHome() {
  return (
    <main style={{ background: "transparent", color: "var(--text)", overflowX: "hidden", position: "relative" }}>
      <SiteNav />
      <MarketingHero />
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
