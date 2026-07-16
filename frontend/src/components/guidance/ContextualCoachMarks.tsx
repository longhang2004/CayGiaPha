"use client";

import {
  CoachMarkCard,
  type UseCoachMarkSequenceOptions,
  useCoachMarkSequence,
} from "./CoachMarkSequence";

export interface ContextualCoachMarksProps extends UseCoachMarkSequenceOptions {
  className?: string;
}

export function ContextualCoachMarks({ className, ...options }: ContextualCoachMarksProps) {
  const sequence = useCoachMarkSequence(options);
  const contextualClassName = ["workspace-coach--contextual", className]
    .filter(Boolean)
    .join(" ");

  return <CoachMarkCard sequence={sequence} className={contextualClassName} />;
}
