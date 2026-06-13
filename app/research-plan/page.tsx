import { Suspense } from "react";
import { ResearchPlan } from "@/components/screens/research-plan";

export default function Page() {
  return (
    <Suspense>
      <ResearchPlan />
    </Suspense>
  );
}
