import { Comparativa } from "@/components/screens/comparativa";
import { getSectionAnalysis } from "@/lib/data";

export default async function Page() {
  const analysis = await getSectionAnalysis("comparativa");
  return <Comparativa analysis={analysis} />;
}
