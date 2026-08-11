import type { Metadata } from "next";
import { CatPlanner } from "./CatPlanner";

export const metadata: Metadata = {
  title: "CAT 2026 Control Room",
  description:
    "A focused CAT 2026 preparation tracker for topics, weekly targets, mocks, revision and exam readiness.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "CAT 2026 Control Room",
    title: "CAT 2026 Control Room",
    description:
      "Show up. Track it. Get better. Your focused control room for CAT 2026 preparation.",
    images: [
      {
        url: "/og-cat-2026.png",
        width: 1731,
        height: 909,
        alt: "CAT 2026 Control Room preparation dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CAT 2026 Control Room",
    description:
      "Show up. Track it. Get better. Your focused control room for CAT 2026 preparation.",
    images: ["/og-cat-2026.png"],
  },
};

export default function Home() {
  return <CatPlanner />;
}
