"use client";

import {
  type CSSProperties,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  getHelpTopic,
  type GuidanceRole,
  type HelpTopic,
} from "@/content/help/helpTopics";
import {
  GUIDANCE_REOPEN_EVENT,
  readGuidanceState,
  recordWorkspaceCoachStatus,
  type WorkspaceCoachChapter,
  type WorkspaceCoachStatus,
} from "@/lib/guidance/storage";

export type CoachMarkPlacement = "top" | "bottom" | "left" | "right";

export interface CoachStep {
  topicId: string;
  anchorIds: string[];
  preferredPlacement?: CoachMarkPlacement;
}

export interface ResolvedCoachStep extends CoachStep {
  anchor: HTMLElement;
  anchorId: string;
  topic: HelpTopic;
}

export interface UseCoachMarkSequenceOptions {
  chapter: WorkspaceCoachChapter;
  role: GuidanceRole;
  steps: CoachStep[];
  enabled: boolean;
  storage?: Storage;
  helpHref?: string;
}

export interface CoachMarkSequenceState {
  currentStep: ResolvedCoachStep | null;
  currentAnchor: HTMLElement | null;
  currentAnchorId: string | null;
  currentTopic: HelpTopic | null;
  index: number;
  count: number;
  active: boolean;
  isFirst: boolean;
  isLast: boolean;
  helpHref: string;
  skipButtonRef: RefObject<HTMLButtonElement>;
  skip: () => void;
  back: () => void;
  nextOrComplete: () => void;
}

export interface CoachMarkCardProps {
  sequence: CoachMarkSequenceState;
  className?: string;
  style?: CSSProperties;
}

function resolveStorage(storage?: Storage) {
  if (storage) return storage;
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function isAvailableAnchor(anchor: HTMLElement) {
  let current: HTMLElement | null = anchor;
  while (current) {
    if (
      current.hasAttribute("inert") ||
      current.hasAttribute("hidden") ||
      current.getAttribute("aria-hidden") === "true"
    ) {
      return false;
    }
    const style = window.getComputedStyle(current);
    if (style.display === "none" || style.visibility === "hidden") return false;
    current = current.parentElement;
  }
  return true;
}

function findAvailableAnchor(anchorId: string) {
  const candidates = document.querySelectorAll<HTMLElement>("[data-guidance-anchor]");
  return Array.from(candidates).find(
    (candidate) =>
      candidate.getAttribute("data-guidance-anchor") === anchorId &&
      isAvailableAnchor(candidate),
  );
}

function requestedReplayChapter(event: Event): WorkspaceCoachChapter | null {
  if (!(event instanceof CustomEvent)) return "overview";
  const detail = event.detail as { chapter?: unknown } | null;
  const chapter = detail?.chapter;
  return chapter === "overview" ||
    chapter === "actions" ||
    chapter === "graph" ||
    chapter === "person"
    ? chapter
    : null;
}

export function useCoachMarkSequence({
  chapter,
  role,
  steps,
  enabled,
  storage,
  helpHref = "/help",
}: UseCoachMarkSequenceOptions): CoachMarkSequenceState {
  const resolvedStorage = resolveStorage(storage);
  const [resolvedSteps, setResolvedSteps] = useState<ResolvedCoachStep[]>([]);
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState(false);
  const skipButtonRef = useRef<HTMLButtonElement>(null);

  const resolveAvailableSteps = useCallback(() => {
    const available: ResolvedCoachStep[] = [];
    steps.forEach((step) => {
      const topic = getHelpTopic(step.topicId, role);
      if (!topic) return;
      for (const anchorId of step.anchorIds) {
        const anchor = findAvailableAnchor(anchorId);
        if (!anchor) continue;
        available.push({ ...step, topic, anchor, anchorId });
        break;
      }
    });
    return available;
  }, [role, steps]);

  const open = useCallback(
    (force: boolean) => {
      if (!enabled) return;
      if (!force) {
        const decision = readGuidanceState(resolvedStorage).workspaceCoach.chapters[chapter];
        if (decision) {
          setActive(false);
          return;
        }
      }
      const available = resolveAvailableSteps();
      setResolvedSteps(available);
      setIndex(0);
      setActive(available.length > 0);
    },
    [chapter, enabled, resolveAvailableSteps, resolvedStorage],
  );

  useEffect(() => {
    if (!enabled) {
      setActive(false);
      return;
    }
    open(false);
  }, [enabled, open]);

  useEffect(() => {
    const handleReplay = (event: Event) => {
      if (requestedReplayChapter(event) === chapter) open(true);
    };
    window.addEventListener(GUIDANCE_REOPEN_EVENT, handleReplay);
    return () => window.removeEventListener(GUIDANCE_REOPEN_EVENT, handleReplay);
  }, [chapter, open]);

  const finish = useCallback(
    (status: WorkspaceCoachStatus) => {
      recordWorkspaceCoachStatus(chapter, status, resolvedStorage);
      setActive(false);
    },
    [chapter, resolvedStorage],
  );

  useEffect(() => {
    if (!active) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    skipButtonRef.current?.focus({ preventScroll: true });
    return () => {
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [active]);

  const currentStep = active ? resolvedSteps[index] ?? null : null;

  useEffect(() => {
    const anchor = currentStep?.anchor;
    if (!active || !anchor) return;
    anchor.setAttribute("data-guidance-highlight", "true");
    return () => anchor.removeAttribute("data-guidance-highlight");
  }, [active, currentStep]);

  useEffect(() => {
    if (!active) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      finish("skipped");
    };
    window.addEventListener("keydown", handleEscape, true);
    return () => window.removeEventListener("keydown", handleEscape, true);
  }, [active, finish]);

  const skip = useCallback(() => finish("skipped"), [finish]);
  const back = useCallback(() => {
    setIndex((current) => Math.max(0, current - 1));
  }, []);
  const nextOrComplete = useCallback(() => {
    if (index >= resolvedSteps.length - 1) {
      finish("completed");
      return;
    }
    setIndex((current) => Math.min(current + 1, resolvedSteps.length - 1));
  }, [finish, index, resolvedSteps.length]);

  return {
    currentStep,
    currentAnchor: currentStep?.anchor ?? null,
    currentAnchorId: currentStep?.anchorId ?? null,
    currentTopic: currentStep?.topic ?? null,
    index,
    count: resolvedSteps.length,
    active,
    isFirst: index === 0,
    isLast: resolvedSteps.length > 0 && index === resolvedSteps.length - 1,
    helpHref,
    skipButtonRef,
    skip,
    back,
    nextOrComplete,
  };
}

export function CoachMarkCard({ sequence, className, style }: CoachMarkCardProps) {
  const topic = sequence.currentTopic;
  if (!sequence.active || !topic) return null;
  const cardClassName = ["workspace-coach", className].filter(Boolean).join(" ");

  return (
    <section
      className={cardClassName}
      style={style}
      role="dialog"
      aria-label="Hướng dẫn nhanh"
      aria-modal="false"
    >
      <div className="workspace-coach__progress" aria-live="polite">
        Bước {sequence.index + 1} / {sequence.count}
      </div>
      <button
        ref={sequence.skipButtonRef}
        type="button"
        className="workspace-coach__skip"
        onClick={sequence.skip}
      >
        Bỏ qua
      </button>
      <h2>{topic.title}</h2>
      <p>{topic.excerpts.contextual ?? topic.summary}</p>
      <div className="workspace-coach__actions">
        <a href={`${sequence.helpHref}#${topic.id}`}>Xem hướng dẫn</a>
        {!sequence.isFirst ? (
          <button type="button" className="btn btn-secondary" onClick={sequence.back}>
            Quay lại
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-primary btn-terracotta"
          onClick={sequence.nextOrComplete}
        >
          {sequence.isLast ? "Hoàn tất" : "Tiếp theo"}
        </button>
      </div>
    </section>
  );
}
