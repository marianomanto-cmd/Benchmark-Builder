import { Portal } from "@/components/screens/portal";
import { getRecentRuns } from "@/lib/data";

export default async function Page() {
  const runs = await getRecentRuns();
  return <Portal runs={runs} />;
}
