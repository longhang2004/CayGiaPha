"use client";

import {
  Fragment,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  CoachMarkCard,
  type CoachMarkSequenceState,
} from "./CoachMarkSequence";
import {
  calculateCoachLayout,
  calculateSpotlightPanes,
  type CoachLayout,
  type CoachRect,
} from "./coachLayout";

interface AnchoredCoachMarkProps {
  sequence: CoachMarkSequenceState;
  className?: string;
  boundaryRef?: RefObject<HTMLElement>;
  cardBoundary?: HTMLElement | null;
  spotlightBoundary?: HTMLElement | null;
  spotlightHost?: HTMLElement | null;
}

interface SpotlightState {
  cutout: CoachRect;
  panes: CoachRect[];
}

const SCROLL_PADDING = 12;

export function ensureTargetVisibleInScrollRegion(target: HTMLElement) {
  const scrollRegion = target.closest<HTMLElement>("[data-panel-scroll-region]");
  if (!scrollRegion) return null;
  const regionRect = scrollRegion.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  if (targetRect.top < regionRect.top + SCROLL_PADDING) {
    scrollRegion.scrollTop = Math.max(
      0,
      scrollRegion.scrollTop + targetRect.top - regionRect.top - SCROLL_PADDING,
    );
  } else if (targetRect.bottom > regionRect.bottom - SCROLL_PADDING) {
    scrollRegion.scrollTop = Math.max(
      0,
      scrollRegion.scrollTop + targetRect.bottom - regionRect.bottom + SCROLL_PADDING,
    );
  }
  return scrollRegion;
}

const toCoachRect = (rect: DOMRect): CoachRect => ({
  left: rect.left,
  top: rect.top,
  right: rect.right,
  bottom: rect.bottom,
  width: rect.width,
  height: rect.height,
});

const rectStyle = (rect: CoachRect): CSSProperties => ({
  left: rect.left,
  top: rect.top,
  width: rect.width,
  height: rect.height,
  pointerEvents: "none",
});

const numericStyle = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function minimumUsableCardHeight(card: HTMLElement) {
  const progress = card.querySelector<HTMLElement>(".workspace-coach__progress");
  const actions = card.querySelector<HTMLElement>(".workspace-coach__actions");
  const style = window.getComputedStyle(card);
  return (progress?.getBoundingClientRect().height ?? 0)
    + (actions?.getBoundingClientRect().height ?? 0)
    + numericStyle(style.paddingTop)
    + numericStyle(style.paddingBottom)
    + numericStyle(style.rowGap) * 2
    + 32;
}

function makeRoomInScrollRegion(
  target: HTMLElement,
  scrollRegion: HTMLElement | null,
  placement: CoachLayout["placement"],
) {
  if (!scrollRegion || (placement !== "top" && placement !== "bottom")) return false;
  const regionRect = scrollRegion.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const previousScrollTop = scrollRegion.scrollTop;
  const delta = placement === "top"
    ? targetRect.bottom - regionRect.bottom + SCROLL_PADDING
    : targetRect.top - regionRect.top - SCROLL_PADDING;
  scrollRegion.scrollTop = Math.max(0, previousScrollTop + delta);
  return scrollRegion.scrollTop !== previousScrollTop;
}

export function AnchoredCoachMark({
  sequence,
  className,
  boundaryRef,
  cardBoundary,
  spotlightBoundary,
  spotlightHost,
}: AnchoredCoachMarkProps) {
  const cardRef = useRef<HTMLElement>(null);
  const [layout, setLayout] = useState<CoachLayout | null>(null);
  const [spotlight, setSpotlight] = useState<SpotlightState | null>(null);

  const measure = useCallback(() => {
    const target = sequence.currentAnchor;
    const card = cardRef.current;
    const boundary = cardBoundary ?? boundaryRef?.current ?? null;
    const spotlightRoot = spotlightBoundary ?? boundary;
    if (!target || !card || !boundary || !spotlightRoot) {
      setLayout(null);
      setSpotlight(null);
      return;
    }

    const scrollRegion = ensureTargetVisibleInScrollRegion(target);
    const boundaryRect = boundary.getBoundingClientRect();
    let targetRect = target.getBoundingClientRect();
    const previousWidth = card.style.width;
    const previousMaxHeight = card.style.maxHeight;
    card.style.width = "";
    card.style.maxHeight = "none";
    const cardRect = card.getBoundingClientRect();
    const naturalCardHeight = Math.max(cardRect.height, card.scrollHeight);
    card.style.width = previousWidth;
    card.style.maxHeight = previousMaxHeight;
    if (boundaryRect.width <= 0 || boundaryRect.height <= 0 || cardRect.width <= 0) {
      setLayout(null);
      setSpotlight(null);
      return;
    }

    let nextLayout = calculateCoachLayout({
      boundary: toCoachRect(boundaryRect),
      target: toCoachRect(targetRect),
      card: {
        width: cardRect.width,
        height: naturalCardHeight,
      },
      preferredPlacement: sequence.currentStep?.preferredPlacement,
    });
    if (
      nextLayout.maxHeight < minimumUsableCardHeight(card)
      && makeRoomInScrollRegion(target, scrollRegion, nextLayout.placement)
    ) {
      targetRect = target.getBoundingClientRect();
      nextLayout = calculateCoachLayout({
        boundary: toCoachRect(boundaryRect),
        target: toCoachRect(targetRect),
        card: {
          width: cardRect.width,
          height: naturalCardHeight,
        },
        preferredPlacement: sequence.currentStep?.preferredPlacement,
      });
    }
    setLayout(nextLayout);
    setSpotlight(calculateSpotlightPanes({
      boundary: toCoachRect(spotlightRoot.getBoundingClientRect()),
      target: toCoachRect(targetRect),
    }));
  }, [
    boundaryRef,
    cardBoundary,
    sequence.currentAnchor,
    sequence.currentStep?.preferredPlacement,
    spotlightBoundary,
  ]);

  useLayoutEffect(() => {
    const target = sequence.currentAnchor;
    const card = cardRef.current;
    const boundary = cardBoundary ?? boundaryRef?.current ?? null;
    const spotlightRoot = spotlightBoundary ?? boundary;
    if (!target || !card || !boundary || !spotlightRoot) return;

    const scrollRegion = ensureTargetVisibleInScrollRegion(target);
    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(measure);
    observer?.observe(target);
    observer?.observe(card);
    observer?.observe(boundary);
    if (spotlightRoot !== boundary) observer?.observe(spotlightRoot);
    scrollRegion?.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    measure();
    const frame = window.requestAnimationFrame(measure);
    return () => {
      observer?.disconnect();
      scrollRegion?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      window.cancelAnimationFrame(frame);
    };
  }, [
    boundaryRef,
    cardBoundary,
    measure,
    sequence.currentAnchor,
    spotlightBoundary,
  ]);

  const cardStyle: CSSProperties = layout
    ? {
        left: layout.left,
        top: layout.top,
        right: "auto",
        bottom: "auto",
        width: layout.width,
        maxHeight: layout.maxHeight,
        visibility: "visible",
      }
    : {
        left: 12,
        top: 12,
        right: "auto",
        bottom: "auto",
        visibility: "visible",
      };

  const spotlightElements = spotlight ? (
    <Fragment>
      {spotlight.panes.map((pane, index) => (
        <div
          key={index}
          className="workspace-coach-spotlight__pane"
          data-coach-spotlight-pane={index}
          aria-hidden="true"
          style={rectStyle(pane)}
        />
      ))}
      <div
        className="workspace-coach-spotlight__cutout"
        data-coach-spotlight-cutout="true"
        aria-hidden="true"
        style={rectStyle(spotlight.cutout)}
      />
    </Fragment>
  ) : null;

  return (
    <>
      {spotlightHost && spotlightElements
        ? createPortal(spotlightElements, spotlightHost)
        : spotlightElements}
      <CoachMarkCard
        sequence={sequence}
        className={className}
        cardRef={cardRef}
        style={cardStyle}
        placement={layout?.placement}
      />
    </>
  );
}
