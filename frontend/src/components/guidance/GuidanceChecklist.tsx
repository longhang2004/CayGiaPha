"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getHelpExcerpt, type GuidanceRole } from "@/content/help/helpTopics";
import { getEligibleChecklist, type GuidanceProductState } from "@/lib/guidance/checklist";
import { ArrowLeftIcon, ArrowRightIcon, MinusIcon, CloseIcon } from "@/components/ui/Icons";
import {
  GUIDANCE_REOPEN_EVENT,
  GUIDANCE_RESET_EVENT,
  readGuidanceState,
  resetGuidanceState,
  writeGuidanceState,
  skipGuidance,
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
  initialPresentation?: "expanded" | "collapsed" | "deferred" | "skipped";
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
  const [state, setState] = useState<GuidanceState>(() => ({ schemaVersion: 3, completed: [], dismissedTopicVersions: {}, onboardingSkipped: false }));
  const [ready, setReady] = useState(false);
  const [collapsed, setCollapsed] = useState(initialPresentation === "collapsed");
  const [deferred, setDeferred] = useState(initialPresentation === "deferred" || deferredForCurrentVisit);
  const [showCompletion, setShowCompletion] = useState(false);
  const [manualReview, setManualReview] = useState(false);
  const [currentPage, setCurrentPage] = useState(-1);
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
    if (ready && items.length > 0 && currentPage === -1) {
      const firstIncomplete = items.findIndex((item) => !completed.has(item.id));
      setCurrentPage(firstIncomplete === -1 ? 0 : firstIncomplete);
    }
  }, [ready, items, completed, currentPage]);

  useEffect(() => {
    const reopen = () => {
      deferredForCurrentVisit = false;
      setDeferred(false);
      setCollapsed(false);
      setShowCompletion(false);
      setManualReview(true);
      setCurrentPage(-1);
    };
    const reset = () => {
      resetGuidanceState(resolvedStorage);
      setState({ schemaVersion: 3, completed: [], dismissedTopicVersions: {}, onboardingSkipped: false });
      reopen();
    };
    window.addEventListener(GUIDANCE_REOPEN_EVENT, reopen);
    window.addEventListener(GUIDANCE_RESET_EVENT, reset);
    return () => {
      window.removeEventListener(GUIDANCE_REOPEN_EVENT, reopen);
      window.removeEventListener(GUIDANCE_RESET_EVENT, reset);
    };
  }, [resolvedStorage]);

  const skipped = state.onboardingSkipped && !manualReview;
  const visible = ready && !deferred && !skipped && (!allComplete || showCompletion || manualReview);
  
  useEffect(() => onVisibilityChange?.(visible), [onVisibilityChange, visible]);

  if (!ready || deferred || skipped || (allComplete && !showCompletion && !manualReview)) return null;
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

  const safePage = Math.max(0, Math.min(currentPage, items.length - 1));
  const currentItem = items[safePage];
  if (!currentItem) return null;

  const isLastPage = safePage === items.length - 1;
  const isFirstPage = safePage === 0;

  const handleSkip = () => {
    skipGuidance(resolvedStorage);
    setState(s => ({ ...s, onboardingSkipped: true }));
  };

  return (
    <section className={`guidance-card guidance-card--${mode}`} aria-labelledby="guidance-title">
      <div className="guidance-card__header">
        <h2 id="guidance-title">Bắt đầu từng bước</h2>
        <div className="guidance-card__controls">
          <button type="button" className="guidance-card__icon-btn" aria-label="Để sau" title="Để sau" onClick={() => { deferredForCurrentVisit = true; setDeferred(true); }}>
            <MinusIcon size={18} />
          </button>
          <button type="button" className="guidance-card__icon-btn" aria-label="Tôi đã nắm rõ cách sử dụng" title="Tôi đã nắm rõ cách sử dụng" onClick={handleSkip}>
            <CloseIcon size={18} />
          </button>
        </div>
      </div>
      
      <div className="guidance-checklist-page">
        <div className={`guidance-checklist-item ${completed.has(currentItem.id) ? "is-complete" : ""}`}>
          <span className="guidance-checklist-item__status" aria-hidden="true">{completed.has(currentItem.id) ? "✓" : "○"}</span>
          <div className="guidance-checklist-item__content">
            <strong>{currentItem.title}</strong>
            <p>{getHelpExcerpt(currentItem.topicId, "checklist", role)}</p>
            <div className="guidance-checklist__links">
              {!completed.has(currentItem.id) && onShowTour ? (
                <button type="button" onClick={() => onShowTour(currentItem.topicId)}>Chỉ tôi</button>
              ) : null}
              <a href={`/help#${currentItem.topicId}`}>Xem cách làm</a>
            </div>
          </div>
        </div>
      </div>

      <div className="guidance-card__footer">
        <div className="guidance-card__pagination">
          <button 
            type="button" 
            className="guidance-card__icon-btn guidance-card__icon-btn--filled" 
            disabled={isFirstPage} 
            onClick={() => setCurrentPage(p => p - 1)} 
            aria-label="Quay lại"
          >
            <ArrowLeftIcon size={20} />
          </button>
          <span className="guidance-card__page-indicator">{safePage + 1} / {items.length}</span>
          <button 
            type="button" 
            className="guidance-card__icon-btn guidance-card__icon-btn--filled" 
            disabled={isLastPage} 
            onClick={() => setCurrentPage(p => p + 1)} 
            aria-label="Tiếp theo"
          >
            <ArrowRightIcon size={20} />
          </button>
        </div>
      </div>
    </section>
  );
}
