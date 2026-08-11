import type { Metadata } from "next";
import { CatPlanner } from "./CatPlanner";

export const metadata: Metadata = {
  title: "CAT 2026 Control Room",
  description:
    "A focused CAT 2026 preparation tracker for topics, weekly targets, mocks, revision and exam readiness.",
};

export default function Home() {
  return <CatPlanner />;
}
