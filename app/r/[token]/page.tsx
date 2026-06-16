import { notFound } from "next/navigation";
import { getPublicReport } from "@/lib/reports";
import { PublicReport } from "@/components/screens/public-report";

// Public read-only share link for a published report. 404 if the token doesn't
// exist or the report isn't public.
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const rec = await getPublicReport(token);
  if (!rec) notFound();
  return <PublicReport doc={rec.doc} />;
}
