import { Comparativa } from "@/components/screens/comparativa";
import { getComparativa, getSectionAnalysis, getCaseHeader } from "@/lib/data";

export default async function Page({ searchParams }: { searchParams: Promise<{ case?: string }> }) {
  const { case: slug } = await searchParams;
  const [c, analysis, header] = await Promise.all([
    getComparativa(slug),
    getSectionAnalysis("comparativa", slug),
    getCaseHeader(slug),
  ]);
  return (
    <Comparativa
      analysis={analysis}
      cols={c.cols}
      rows={c.rows}
      platsByCol={c.platsByCol}
      breadcrumb={["Proyectos", header.crumb, "Comparativa"]}
      caseSlug={slug}
    />
  );
}
