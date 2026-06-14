import { cookies } from "next/headers";
import { MarketingHome } from "@/components/screens/portal";
import { AppHome } from "@/components/screens/app-home";
import { getRecentRuns } from "@/lib/data";
import { SESSION_COOKIE } from "@/lib/session";

export default async function Page() {
  const loggedIn = (await cookies()).get(SESSION_COOKIE)?.value === "1";
  if (!loggedIn) return <MarketingHome />;
  const runs = await getRecentRuns();
  return <AppHome runs={runs} />;
}
