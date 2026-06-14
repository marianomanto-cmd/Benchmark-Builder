import { ProjectView } from "@/components/screens/project-view";

export default async function Page({ params }: { params: Promise<{ project: string }> }) {
  const { project } = await params;
  return <ProjectView slug={project} />;
}
