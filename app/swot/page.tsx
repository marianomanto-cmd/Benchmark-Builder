import { Swot } from "@/components/screens/swot";
import { getSectionAnalysis } from "@/lib/data";

export default async function Page() {
  const analysis = await getSectionAnalysis("swot");
  return <Swot analysis={analysis} />;
}
