import { notFound } from "next/navigation";
import { ProjectView } from "@/components/screens/project-view";
import { getProject } from "@/lib/accounts";

export default async function Page({ params }: { params: Promise<{ project: string }> }) {
  const { project } = await params;
  const found = getProject(project);
  if (!found) notFound();
  return <ProjectView account={found.account} project={found.project} />;
}
