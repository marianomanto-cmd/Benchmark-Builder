import { ReportPDF } from "@/components/screens/report-pdf";
import { getCase } from "@/lib/demo-cases";
import { getBranding } from "@/lib/branding-server";

export default async function Page({ searchParams }: { searchParams: Promise<{ case?: string }> }) {
  const { case: slug } = await searchParams;
  const branding = await getBranding();
  return <ReportPDF data={getCase(slug)} branding={branding} />;
}
