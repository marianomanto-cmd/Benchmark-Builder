import { ReportPDF } from "@/components/screens/report-pdf";
import { getCase } from "@/lib/demo-cases";

export default async function Page({ searchParams }: { searchParams: Promise<{ case?: string }> }) {
  const { case: slug } = await searchParams;
  return <ReportPDF data={getCase(slug)} />;
}
