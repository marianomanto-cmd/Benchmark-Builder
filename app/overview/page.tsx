import { Overview } from "@/components/screens/overview";
import { getOverviewData } from "@/lib/data";

export default async function Page() {
  const data = await getOverviewData();
  return <Overview {...data} />;
}
