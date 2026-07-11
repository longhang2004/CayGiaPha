"use client";

import { useCallback, useState } from "react";
import type { GuidanceRole } from "@/content/help/helpTopics";
import type { GuidanceProductState } from "@/lib/guidance/checklist";
import { GuidanceChecklist } from "./GuidanceChecklist";
import { ContextNote } from "./ContextNote";
import { ManualGuidanceTour } from "./ManualGuidanceTour";

interface Props {
  role: GuidanceRole;
  productState: GuidanceProductState;
  contextualTopicId: string;
  initialTourTopicId?: string | null;
  tourAnchorOverride?: string;
  initialChecklistPresentation?: "expanded" | "collapsed" | "deferred";
}

export function GuidanceOrchestrator({ role, productState, contextualTopicId, initialTourTopicId = null, tourAnchorOverride, initialChecklistPresentation = "expanded" }: Props) {
  const [tourTopicId, setTourTopicId] = useState<string | null>(initialTourTopicId);
  const [checklistVisible, setChecklistVisible] = useState(true);
  const closeTour = useCallback(() => setTourTopicId(null), []);

  if (tourTopicId) return <ManualGuidanceTour topicId={tourTopicId} role={role} onClose={closeTour} anchorOverride={tourAnchorOverride} />;
  return (
    <>
      <div className="guidance-orchestrator__checklist">
        <GuidanceChecklist
          role={role}
          productState={productState}
          mode="compact"
          onShowTour={setTourTopicId}
          onVisibilityChange={setChecklistVisible}
          initialPresentation={initialChecklistPresentation}
        />
      </div>
      {!checklistVisible ? <ContextNote topicId={contextualTopicId} role={role} /> : null}
    </>
  );
}
