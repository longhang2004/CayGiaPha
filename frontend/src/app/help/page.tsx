import type { Metadata } from "next";
import { HelpGuide } from "@/components/help/HelpGuide";

/**
 * Help_System route (Requirement 17).
 *
 * Renders the static usage guide. Because the content is static and rendered
 * server-side with no async data fetching, the guide displays well within the
 * 2-second budget (17.3). Reached from the main interface via the
 * HelpEntryPoint link (17.1).
 */
export const metadata: Metadata = {
  title: "Hướng dẫn sử dụng — Cây Gia Phả",
  description:
    "Hướng dẫn trong ứng dụng về các khái niệm và thao tác cốt lõi của Cây Gia Phả.",
};

export default function HelpPage() {
  return <HelpGuide />;
}
