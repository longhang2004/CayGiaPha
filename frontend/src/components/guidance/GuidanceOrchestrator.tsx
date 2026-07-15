"use client";

import type { GuidanceRole } from "@/content/help/helpTopics";
import { WorkspaceCoachMarks } from "./WorkspaceCoachMarks";

interface Props {
  role: GuidanceRole;
  initialTourTopicId?: string | null;
  tourAnchorOverride?: string;
  helpHref?: string;
}

export function GuidanceOrchestrator({
  role,
  initialTourTopicId = null,
  tourAnchorOverride,
  helpHref = "/help",
}: Props) {
  return (
    <WorkspaceCoachMarks
      role={role}
      initialTopicId={initialTourTopicId}
      anchorOverride={tourAnchorOverride}
      helpHref={helpHref}
    />
  );
}
