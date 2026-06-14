import { Galeria } from "@/components/screens/galeria";
import { getGallery, getSectionAnalysis, getCaseHeader } from "@/lib/data";

export default async function Page({ searchParams }: { searchParams: Promise<{ case?: string }> }) {
  const { case: slug } = await searchParams;
  const [g, analysis, header] = await Promise.all([
    getGallery(slug),
    getSectionAnalysis("galeria", slug),
    getCaseHeader(slug),
  ]);
  return (
    <Galeria
      analysis={analysis}
      adGroups={g.adGroups}
      organicGroups={g.organicGroups}
      adTotal={g.adTotal}
      adSpend={g.adSpend}
      organicTotal={g.organicTotal}
      breadcrumb={["Proyectos", header.crumb, "Galería"]}
      caseSlug={slug}
    />
  );
}
