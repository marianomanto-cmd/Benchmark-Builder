import { AccountView } from "@/components/screens/account-view";

export default async function Page({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  return <AccountView slug={account} />;
}
