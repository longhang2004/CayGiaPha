"use client";

import {
  CoachMarkCard,
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
  const sequence = useCoachMarkSequence({ chapter, ...options });
  const contextualClassName = ["workspace-coach--contextual", className]
    .filter(Boolean)
    .join(" ");

  if (!sequence.active) return null;

  return (
    <div
      className={`workspace-coach-layer workspace-coach-layer--${chapter}`}
      data-coach-layer={chapter}
    >
      <CoachMarkCard sequence={sequence} className={contextualClassName} />
    </div>
  );
}
