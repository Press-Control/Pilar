import { Suspense } from "react";
import { DecisionLab } from "@/components/lab/DecisionLab";

export const metadata = { title: "Decision Lab · El Pilar" };

export default function LabPage() {
  return (
    <Suspense fallback={<section className="decision-lab" aria-label="Decision Lab" />}>
      <DecisionLab />
    </Suspense>
  );
}
