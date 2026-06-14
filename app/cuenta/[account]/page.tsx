import { notFound } from "next/navigation";
import { AccountView } from "@/components/screens/account-view";
import { getAccount } from "@/lib/accounts";

export default async function Page({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  const acc = getAccount(account);
  if (!acc) notFound();
  return <AccountView account={acc} />;
}
