import { LiveFeed } from "@/components/screens/live-feed";
import { getMentions, getSectionAnalysis } from "@/lib/data";

export default async function Page() {
  const [mentions, analysis] = await Promise.all([getMentions(), getSectionAnalysis("live-feed")]);
  return <LiveFeed mentions={mentions} analysis={analysis} />;
}
