import { RunsHistory } from "@/components/screens/runs";
import { getRuns } from "@/lib/data";

export default async function Page() {
  const runs = await getRuns();
  return <RunsHistory runs={runs} />;
}
