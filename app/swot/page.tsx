import { Swot } from "@/components/screens/swot";
import { getSwotData, getSectionAnalysis, getCaseHeader } from "@/lib/data";

export default async function Page({ searchParams }: { searchParams: Promise<{ case?: string }> }) {
  const { case: slug } = await searchParams;
  const [sw, analysis, header] = await Promise.all([
    getSwotData(slug),
    getSectionAnalysis("swot", slug),
    getCaseHeader(slug),
  ]);
  return (
    <Swot
      analysis={analysis}
      swot={sw.swot}
      matrix={sw.matrix}
      plan={sw.plan}
      breadcrumb={["Proyectos", header.crumb, "FODA & Estrategia"]}
      runMeta={`generado del run #${String(header.runNumber).padStart(3, "0")}`}
      caseSlug={slug}
    />
  );
}
