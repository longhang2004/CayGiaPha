"use client";

import { useState } from "react";
import { AnchoredCoachMark } from "./AnchoredCoachMark";
import {
  type UseCoachMarkSequenceOptions,
  useCoachMarkSequence,
} from "./CoachMarkSequence";

export interface ContextualCoachMarksProps extends UseCoachMarkSequenceOptions {
  className?: string;
}

export function ContextualCoachMarks({
  className,
  chapter,
  ...options
}: ContextualCoachMarksProps) {
  const [layer, setLayer] = useState<HTMLDivElement | null>(null);
  const sequence = useCoachMarkSequence({ chapter, ...options });
  const contextualClassName = ["workspace-coach--contextual", className]
    .filter(Boolean)
    .join(" ");

  if (!sequence.active) return null;

  return (
    <div
      ref={setLayer}
      className={`workspace-coach-layer workspace-coach-layer--${chapter}`}
      data-coach-layer={chapter}
    >
      <AnchoredCoachMark
        sequence={sequence}
        cardBoundary={layer}
        spotlightBoundary={layer}
        className={contextualClassName}
      />
    </div>
  );
}
