import { Galeria } from "@/components/screens/galeria";
import { getSectionAnalysis } from "@/lib/data";

export default async function Page() {
  const analysis = await getSectionAnalysis("galeria");
  return <Galeria analysis={analysis} />;
}
