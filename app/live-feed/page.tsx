import { LiveFeed } from "@/components/screens/live-feed";
import { getMentions, getSectionAnalysis, getCaseHeader } from "@/lib/data";

export default async function Page({ searchParams }: { searchParams: Promise<{ case?: string }> }) {
  const { case: slug } = await searchParams;
  const [mentions, analysis, header] = await Promise.all([
    getMentions(slug),
    getSectionAnalysis("live-feed", slug),
    getCaseHeader(slug),
  ]);
  return <LiveFeed mentions={mentions} analysis={analysis} breadcrumb={["@nav.dashboard", header.crumb, "@shell.nav.livefeed"]} caseSlug={slug} />;
}
