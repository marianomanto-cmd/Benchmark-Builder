import { Overview } from "@/components/screens/overview";
import { getOverviewData, getSectionAnalysis } from "@/lib/data";

export default async function Page() {
  const [data, analysis] = await Promise.all([getOverviewData(), getSectionAnalysis("overview")]);
  return <Overview {...data} analysis={analysis} />;
}
