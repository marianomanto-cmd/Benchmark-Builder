import { Projects } from "@/components/screens/projects";
import { getProjects } from "@/lib/data";

export default async function Page() {
  const projects = await getProjects();
  return <Projects projects={projects} />;
}
