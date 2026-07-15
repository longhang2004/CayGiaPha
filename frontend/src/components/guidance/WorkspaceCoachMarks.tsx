"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getHelpExcerpt, getHelpTopic, type GuidanceRole } from "@/content/help/helpTopics";
import {
  GUIDANCE_REOPEN_EVENT,
  readGuidanceState,
  recordWorkspaceCoachStatus,
} from "@/lib/guidance/storage";
import { useGraphOverlay } from "./GraphOverlayBoundary";

interface CoachStep {
  topicId: string;
  anchorId: string;
  preferredPlacement: "top" | "bottom" | "left" | "right";
}

const TOPIC_ANCHORS: Record<string, string> = {
  "doi-diem-nhin": "workspace-viewpoint",
  "dieu-huong-so-do": "graph-navigation",
  "them-quan-he-ro-rang": "workspace-add-relative",
};

const MIN_COACH_SAFE_HEIGHT = 280;

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
  const resolvedStorage = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  const { safeRect, getPlacement } = useGraphOverlay();
  const [steps, setSteps] = useState<CoachStep[]>([]);
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [workspaceBlocked, setWorkspaceBlocked] = useState(false);
  const skipButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const findAvailableSteps = useCallback(() => {
    const hasAnchor = (anchorId: string) => Boolean(document.querySelector(`[data-guidance-anchor="${anchorId}"]`));
    if (initialTopicId) {
      const anchorId = anchorOverride ?? TOPIC_ANCHORS[initialTopicId] ?? "graph-navigation";
      if (!hasAnchor(anchorId)) return [];
      return [{
        topicId: initialTopicId,
        anchorId,
        preferredPlacement: "bottom" as const,
      }];
    }

    const nextSteps: CoachStep[] = [];
    if (hasAnchor("workspace-viewpoint")) {
      nextSteps.push({ topicId: "doi-diem-nhin", anchorId: "workspace-viewpoint", preferredPlacement: "bottom" });
    }
    if (hasAnchor("workspace-tabs")) {
      nextSteps.push({ topicId: "dieu-huong-so-do", anchorId: "workspace-tabs", preferredPlacement: "bottom" });
    }
    if (role !== "reader" && hasAnchor("workspace-add-relative")) {
      nextSteps.push({ topicId: "them-quan-he-ro-rang", anchorId: "workspace-add-relative", preferredPlacement: "top" });
    } else if (hasAnchor("graph-navigation")) {
      nextSteps.push({ topicId: "dieu-huong-so-do", anchorId: "graph-navigation", preferredPlacement: "left" });
    } else if (hasAnchor("workspace-help")) {
      nextSteps.push({ topicId: "dieu-huong-so-do", anchorId: "workspace-help", preferredPlacement: "top" });
    }
    return nextSteps;
  }, [anchorOverride, initialTopicId, role]);

  const openCoach = useCallback((force = false) => {
    const availableSteps = findAvailableSteps();
    setSteps(availableSteps);
    setStepIndex(0);
    if (availableSteps.length === 0) return;
    const state = readGuidanceState(resolvedStorage);
    if (force || initialTopicId || state.workspaceCoach === null) setActive(true);
  }, [findAvailableSteps, initialTopicId, resolvedStorage]);

  useEffect(() => {
    // TreeWorkspaceSurface mounts its panels after hydration. A short deferred
    // start lets the tab and graph anchors exist before the step list is built.
    const timer = window.setTimeout(() => openCoach(false), 80);
    const reopen = () => openCoach(true);
    window.addEventListener(GUIDANCE_REOPEN_EVENT, reopen);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(GUIDANCE_REOPEN_EVENT, reopen);
    };
  }, [openCoach]);

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

  const currentStep = steps[stepIndex];
  const topic = currentStep ? getHelpTopic(currentStep.topicId, role) : undefined;
  const placement = useMemo(
    () => currentStep ? getPlacement(currentStep.anchorId, currentStep.preferredPlacement) : null,
    [currentStep, getPlacement],
  );
  const renderable = active
    && !workspaceBlocked
    && safeRect.width > 0
    && safeRect.height >= MIN_COACH_SAFE_HEIGHT;

  useEffect(() => {
    if (!renderable) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    skipButtonRef.current?.focus();
    return () => previousFocusRef.current?.focus();
  }, [renderable]);

  useEffect(() => {
    if (!renderable || !placement?.target) return;
    placement.target.setAttribute("data-guidance-highlight", "true");
    return () => placement.target?.removeAttribute("data-guidance-highlight");
  }, [placement?.target, renderable, stepIndex]);

  const finish = useCallback((status: "completed" | "skipped") => {
    recordWorkspaceCoachStatus(status, resolvedStorage);
    setActive(false);
  }, [resolvedStorage]);

  useEffect(() => {
    if (!renderable) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish("skipped");
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [finish, renderable]);

  if (!renderable || !currentStep || !topic || !placement) return null;
  const isLastStep = stepIndex === steps.length - 1;
  const mobile = safeRect.width > 0 && safeRect.width < 520;

  return (
    <section
      className={`workspace-coach ${mobile ? "workspace-coach--mobile" : ""}`}
      style={mobile ? undefined : placement.style}
      role="dialog"
      aria-label="Hướng dẫn nhanh"
      aria-modal="false"
      data-fallback={placement.fallback ? "true" : undefined}
    >
      <div className="workspace-coach__progress" aria-live="polite">
        Bước {stepIndex + 1} / {steps.length}
      </div>
      <button
        ref={skipButtonRef}
        type="button"
        className="workspace-coach__skip"
        onClick={() => finish("skipped")}
      >
        Bỏ qua
      </button>
      <h2>{topic.title}</h2>
      <p>{getHelpExcerpt(topic.id, "contextual", role) ?? topic.summary}</p>
      <div className="workspace-coach__actions">
        <a href={`${helpHref}#${topic.id}`}>Xem hướng dẫn</a>
        <button
          type="button"
          className="btn btn-primary btn-terracotta"
          onClick={() => {
            if (isLastStep) finish("completed");
            else setStepIndex((index) => index + 1);
          }}
          aria-label={isLastStep ? "Hoàn tất" : "Tiếp theo"}
        >
          {isLastStep ? "Hoàn tất" : "Tiếp theo"}
        </button>
      </div>
    </section>
  );
}
