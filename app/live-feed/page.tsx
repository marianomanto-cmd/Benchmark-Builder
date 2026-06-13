import { LiveFeed } from "@/components/screens/live-feed";
import { getMentions } from "@/lib/data";

export default async function Page() {
  const mentions = await getMentions();
  return <LiveFeed mentions={mentions} />;
}
