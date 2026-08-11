import type { Metadata } from "next";
import { AdmissionsPlanner } from "./AdmissionsPlanner";

export const metadata: Metadata = {
  title: "Admissions Control Room",
  description: "Track MBA applications, interviews, decisions and admission milestones.",
};

export default function AdmissionsPage() {
  return <AdmissionsPlanner />;
}
