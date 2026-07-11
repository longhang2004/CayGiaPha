"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getHelpExcerpt, type GuidanceRole } from "@/content/help/helpTopics";
import { getEligibleChecklist, type GuidanceProductState } from "@/lib/guidance/checklist";
import {
  GUIDANCE_REOPEN_EVENT,
  GUIDANCE_RESET_EVENT,
  readGuidanceState,
  resetGuidanceState,
  writeGuidanceState,
  type GuidanceState,
} from "@/lib/guidance/storage";

let deferredForCurrentVisit = false;
export function resetDeferredGuidanceForVisit() { deferredForCurrentVisit = false; }

interface Props {
  role: GuidanceRole;
  productState: GuidanceProductState;
  mode?: "overview" | "compact";
  storage?: Storage;
  onShowTour?: (topicId: string) => void;
  onVisibilityChange?: (visible: boolean) => void;
  initialPresentation?: "expanded" | "collapsed" | "deferred";
}

export function GuidanceChecklist({
  role,
  productState,
  mode = "overview",
  storage,
  onShowTour,
  onVisibilityChange,
  initialPresentation = "expanded",
}: Props) {
  const [state, setState] = useState<GuidanceState>(() => ({ schemaVersion: 2, completed: [], dismissedTopicVersions: {} }));
  const [ready, setReady] = useState(false);
  const [collapsed, setCollapsed] = useState(initialPresentation === "collapsed");
  const [deferred, setDeferred] = useState(initialPresentation === "deferred" || deferredForCurrentVisit);
  const [showCompletion, setShowCompletion] = useState(false);
  const [manualReview, setManualReview] = useState(false);
  const previouslyComplete = useRef<boolean | null>(null);

  const resolvedStorage = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  useEffect(() => {
    setState(readGuidanceState(resolvedStorage));
    setReady(true);
  }, [resolvedStorage]);

  const items = useMemo(() => getEligibleChecklist(role, productState), [role, productState]);
  const productCompleted = useMemo(
    () => items.filter((item) => item.complete(productState)).map((item) => item.id),
    [items, productState],
  );
  const completed = useMemo(
    () => new Set([...state.completed, ...productCompleted]),
    [state.completed, productCompleted],
  );
  const allComplete = items.length > 0 && items.every((item) => completed.has(item.id));
  const completionKey = productCompleted.join("|");

  useEffect(() => {
    if (!ready) return;
    setState((current) => {
      if (productCompleted.every((id) => current.completed.includes(id))) return current;
      const next = { ...current, completed: Array.from(new Set([...current.completed, ...productCompleted])) };
      writeGuidanceState(next, resolvedStorage);
      return next;
    });
  }, [ready, completionKey, productCompleted, resolvedStorage]);

  useEffect(() => {
    if (!ready) return;
    if (previouslyComplete.current === false && allComplete) {
      setShowCompletion(true);
      const timer = window.setTimeout(() => setShowCompletion(false), 1800);
      return () => window.clearTimeout(timer);
    }
    previouslyComplete.current = allComplete;
  }, [allComplete, ready]);

  useEffect(() => {
    const reopen = () => {
      deferredForCurrentVisit = false;
      setDeferred(false);
      setCollapsed(false);
      setShowCompletion(false);
      setManualReview(true);
    };
    const reset = () => {
      resetGuidanceState(resolvedStorage);
      setState({ schemaVersion: 2, completed: [], dismissedTopicVersions: {} });
      reopen();
    };
    window.addEventListener(GUIDANCE_REOPEN_EVENT, reopen);
    window.addEventListener(GUIDANCE_RESET_EVENT, reset);
    return () => {
      window.removeEventListener(GUIDANCE_REOPEN_EVENT, reopen);
      window.removeEventListener(GUIDANCE_RESET_EVENT, reset);
    };
  }, [resolvedStorage]);

  const visible = ready && !deferred && (!allComplete || showCompletion || manualReview);
  useEffect(() => onVisibilityChange?.(visible), [onVisibilityChange, visible]);

  if (!ready || deferred || (allComplete && !showCompletion && !manualReview)) return null;
  if (showCompletion) {
    return (
      <section className="guidance-card guidance-card--completed" role="status" aria-live="polite">
        <strong>Bạn đã hoàn thành các bước bắt đầu.</strong>
      </section>
    );
  }

  const nextItem = items.find((item) => !completed.has(item.id));
  if (collapsed) {
    return (
      <section className="guidance-card guidance-card--collapsed" aria-label="Hướng dẫn bắt đầu">
        <span>{nextItem ? `Bước tiếp theo: ${nextItem.title}` : "Hướng dẫn bắt đầu"}</span>
        <button type="button" className="btn btn-secondary" onClick={() => setCollapsed(false)}>Mở hướng dẫn</button>
      </section>
    );
  }

  return (
    <section className={`guidance-card guidance-card--${mode}`} aria-labelledby="guidance-title">
      <div className="guidance-card__header">
        <div>
          <h2 id="guidance-title">Bắt đầu từng bước</h2>
          <p>{getHelpExcerpt("tao-hoac-mo-cay", "overview", role)}</p>
        </div>
        <button type="button" className="guidance-card__close" aria-label="Thu gọn hướng dẫn" onClick={() => setCollapsed(true)}>×</button>
      </div>
      <ol className="guidance-checklist">
        {items.map((item) => (
          <li key={item.id} className={completed.has(item.id) ? "is-complete" : ""}>
            <span aria-hidden="true">{completed.has(item.id) ? "✓" : "○"}</span>
            <div>
              <strong>{item.title}</strong>
              <p>{getHelpExcerpt(item.topicId, "checklist", role)}</p>
              <div className="guidance-checklist__links">
                {!completed.has(item.id) && onShowTour ? (
                  <button type="button" onClick={() => onShowTour(item.topicId)}>Chỉ tôi</button>
                ) : null}
                <a href={`/help#${item.topicId}`}>Xem cách làm</a>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <div className="guidance-card__actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            deferredForCurrentVisit = true;
            setDeferred(true);
          }}
        >
          Để sau
        </button>
      </div>
    </section>
  );
}
