import type { CoachMarkPlacement } from "./CoachMarkSequence";

export interface CoachRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface CoachSize {
  width: number;
  height: number;
}

export interface CoachLayout {
  placement: CoachMarkPlacement;
  left: number;
  top: number;
  width: number;
  maxHeight: number;
}

interface CalculateCoachLayoutOptions {
  boundary: CoachRect;
  target: CoachRect;
  card: CoachSize;
  preferredPlacement?: CoachMarkPlacement;
  gap?: number;
  padding?: number;
}

interface CalculateSpotlightOptions {
  boundary: CoachRect;
  target: CoachRect;
  padding?: number;
}

const DEFAULT_GAP = 12;
const DEFAULT_BOUNDARY_PADDING = 12;
const DEFAULT_SPOTLIGHT_PADDING = 8;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(value, maximum));

const localRect = (left: number, top: number, width: number, height: number): CoachRect => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
  width,
  height,
});

const placementOrder = (preferred: CoachMarkPlacement): CoachMarkPlacement[] => {
  if (preferred === "top") return ["top", "bottom", "right", "left"];
  if (preferred === "left") return ["left", "right", "bottom", "top"];
  if (preferred === "right") return ["right", "left", "bottom", "top"];
  return ["bottom", "top", "right", "left"];
};

export function calculateCoachLayout({
  boundary,
  target,
  card,
  preferredPlacement = "bottom",
  gap = DEFAULT_GAP,
  padding = DEFAULT_BOUNDARY_PADDING,
}: CalculateCoachLayoutOptions): CoachLayout {
  const innerLeft = boundary.left + padding;
  const innerTop = boundary.top + padding;
  const innerRight = Math.max(innerLeft, boundary.right - padding);
  const innerBottom = Math.max(innerTop, boundary.bottom - padding);
  const innerWidth = Math.max(0, innerRight - innerLeft);
  const innerHeight = Math.max(0, innerBottom - innerTop);
  const width = Math.min(card.width, innerWidth);
  const height = Math.min(card.height, innerHeight);
  const order = placementOrder(preferredPlacement);

  const availableFor = (placement: CoachMarkPlacement) => {
    if (placement === "top") {
      return Math.max(0, Math.min(innerBottom, target.top - gap) - innerTop);
    }
    if (placement === "bottom") {
      return Math.max(0, innerBottom - Math.max(innerTop, target.bottom + gap));
    }
    if (placement === "left") {
      return Math.max(0, Math.min(innerRight, target.left - gap) - innerLeft);
    }
    return Math.max(0, innerRight - Math.max(innerLeft, target.right + gap));
  };

  const fitsNaturally = (placement: CoachMarkPlacement) => {
    if (placement === "top" || placement === "bottom") {
      return availableFor(placement) >= height;
    }
    return availableFor(placement) >= width && innerHeight >= height;
  };

  let placement = order.find(fitsNaturally);
  let placedHeight = height;

  if (!placement) {
    const candidates = order
      .map((candidate, index) => {
        const horizontal = candidate === "left" || candidate === "right";
        const usableHeight = horizontal
          ? availableFor(candidate) >= width ? innerHeight : 0
          : availableFor(candidate);
        return { candidate, index, usableHeight };
      })
      .filter(({ usableHeight }) => usableHeight > 0)
      .sort((first, second) =>
        second.usableHeight - first.usableHeight || first.index - second.index,
      );
    placement = candidates[0]?.candidate ?? preferredPlacement;
    placedHeight = Math.min(height, candidates[0]?.usableHeight ?? innerHeight);
  }

  const centeredLeft = clamp(
    target.left + target.width / 2 - width / 2,
    innerLeft,
    Math.max(innerLeft, innerRight - width),
  );
  const centeredTop = clamp(
    target.top + target.height / 2 - placedHeight / 2,
    innerTop,
    Math.max(innerTop, innerBottom - placedHeight),
  );

  let absoluteLeft = centeredLeft;
  let absoluteTop = centeredTop;
  if (placement === "top") {
    absoluteTop = clamp(
      target.top - gap - placedHeight,
      innerTop,
      Math.max(innerTop, innerBottom - placedHeight),
    );
  } else if (placement === "bottom") {
    absoluteTop = clamp(
      Math.max(innerTop, target.bottom + gap),
      innerTop,
      Math.max(innerTop, innerBottom - placedHeight),
    );
  } else if (placement === "left") {
    absoluteLeft = clamp(
      target.left - gap - width,
      innerLeft,
      Math.max(innerLeft, innerRight - width),
    );
  } else {
    absoluteLeft = clamp(
      Math.max(innerLeft, target.right + gap),
      innerLeft,
      Math.max(innerLeft, innerRight - width),
    );
  }

  return {
    placement,
    left: absoluteLeft - boundary.left,
    top: absoluteTop - boundary.top,
    width,
    maxHeight: placedHeight,
  };
}

export function calculateSpotlightPanes({
  boundary,
  target,
  padding = DEFAULT_SPOTLIGHT_PADDING,
}: CalculateSpotlightOptions) {
  const cutoutLeft = clamp(target.left - padding, boundary.left, boundary.right);
  const cutoutTop = clamp(target.top - padding, boundary.top, boundary.bottom);
  const cutoutRight = clamp(target.right + padding, cutoutLeft, boundary.right);
  const cutoutBottom = clamp(target.bottom + padding, cutoutTop, boundary.bottom);
  const left = cutoutLeft - boundary.left;
  const top = cutoutTop - boundary.top;
  const right = cutoutRight - boundary.left;
  const bottom = cutoutBottom - boundary.top;
  const cutout = localRect(left, top, right - left, bottom - top);

  return {
    cutout,
    panes: [
      localRect(0, 0, boundary.width, top),
      localRect(0, bottom, boundary.width, Math.max(0, boundary.height - bottom)),
      localRect(0, top, left, Math.max(0, bottom - top)),
      localRect(right, top, Math.max(0, boundary.width - right), Math.max(0, bottom - top)),
    ],
  };
}
