"use client";

import { useEffect, useMemo, useState } from "react";
import { type GuidanceRole } from "@/content/help/helpTopics";
import { reopenGuidanceChapter } from "@/lib/guidance/storage";
import { AnchoredCoachMark } from "./AnchoredCoachMark";
import {
  type CoachStep,
  useCoachMarkSequence,
} from "./CoachMarkSequence";
import { useGraphOverlay } from "./GraphOverlayBoundary";

const OVERVIEW_STEPS: CoachStep[] = [
  {
    topicId: "tao-hoac-mo-cay",
    anchorIds: ["workspace-context"],
    preferredPlacement: "bottom",
  },
  {
    topicId: "doi-diem-nhin",
    anchorIds: ["workspace-viewpoint"],
    preferredPlacement: "bottom",
  },
  {
    topicId: "dieu-huong-so-do",
    anchorIds: ["workspace-search", "workspace-tabs"],
    preferredPlacement: "bottom",
  },
  {
    topicId: "xem-thong-tin-va-xung-ho",
    anchorIds: ["workspace-person-list", "graph-person-node"],
    preferredPlacement: "right",
  },
  {
    topicId: "thao-tac-trong-cay",
    anchorIds: ["workspace-actions"],
    preferredPlacement: "top",
  },
];

const TOPIC_ANCHORS: Record<string, string[]> = {
  "doi-diem-nhin": ["workspace-viewpoint"],
  "dieu-huong-so-do": ["workspace-search", "workspace-tabs", "graph-navigation"],
  "them-nguoi-moi": ["workspace-add-person"],
  "them-quan-he-ro-rang": ["workspace-person-list", "workspace-tabs"],
};

const MIN_COACH_SAFE_HEIGHT = 160;

interface Props {
  role: GuidanceRole;
  storage?: Storage;
  helpHref?: string;
  initialTopicId?: string | null;
  anchorOverride?: string;
}

export function WorkspaceCoachMarks({
  role,
  storage,
  helpHref = "/help",
  initialTopicId = null,
  anchorOverride,
}: Props) {
  const { root, layer, spotlightLayer, safeRect } = useGraphOverlay();
  const [ready, setReady] = useState(false);
  const [workspaceBlocked, setWorkspaceBlocked] = useState(false);

  const steps = useMemo<CoachStep[]>(() => {
    if (!initialTopicId) return OVERVIEW_STEPS;
    return [{
      topicId: initialTopicId,
      anchorIds: anchorOverride
        ? [anchorOverride]
        : TOPIC_ANCHORS[initialTopicId] ?? ["graph-navigation"],
      preferredPlacement: "bottom",
    }];
  }, [anchorOverride, initialTopicId]);

  useEffect(() => {
    // TreeWorkspaceSurface mounts its panels after hydration. A short deferred
    // start lets the workspace and graph anchors exist before resolution.
    const timer = window.setTimeout(() => setReady(true), 80);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const syncWorkspaceConflict = () => {
      setWorkspaceBlocked(Boolean(document.querySelector(
        ".tree-workspace__info-panel--open, .cgp-drawer-overlay",
      )));
    };
    syncWorkspaceConflict();
    const observer = new MutationObserver(syncWorkspaceConflict);
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const enabled = ready
    && !workspaceBlocked
    && safeRect.width > 0
    && safeRect.height >= MIN_COACH_SAFE_HEIGHT;
  const sequence = useCoachMarkSequence({
    chapter: "overview",
    role,
    steps,
    enabled,
    storage,
    helpHref,
  });

  useEffect(() => {
    if (enabled && initialTopicId) reopenGuidanceChapter("overview");
  }, [enabled, initialTopicId]);

  if (
    !enabled ||
    !sequence.active ||
    !root ||
    !layer ||
    !spotlightLayer
  ) return null;

  return (
    <AnchoredCoachMark
      sequence={sequence}
      cardBoundary={layer}
      spotlightBoundary={root}
      spotlightHost={spotlightLayer}
    />
  );
}
