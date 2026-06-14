import { Overview } from "@/components/screens/overview";
import { getOverviewData, getSectionAnalysis, getCaseHeader } from "@/lib/data";

export default async function Page({ searchParams }: { searchParams: Promise<{ case?: string }> }) {
  const { case: slug } = await searchParams;
  const [data, analysis, header] = await Promise.all([
    getOverviewData(slug),
    getSectionAnalysis("overview", slug),
    getCaseHeader(slug),
  ]);
  return (
    <Overview
      {...data}
      analysis={analysis}
      hero={header.hero}
      kpis={header.kpis}
      breadcrumb={["Proyectos", header.crumb]}
      runMeta={`run #${String(header.runNumber).padStart(3, "0")}`}
      caseSlug={slug}
    />
  );
}
