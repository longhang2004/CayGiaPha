"use client";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { getHelpExcerpt, getHelpTopic, type GuidanceRole } from "@/content/help/helpTopics";
import { readGuidanceState, writeGuidanceState } from "@/lib/guidance/storage";
interface Props { topicId: string; role: GuidanceRole; manual?: boolean; onClose?: () => void; children?: ReactNode; }
export function ContextNote({ topicId, role, manual = false, onClose, children }: Props) {
  const topic = getHelpTopic(topicId, role); const [visible, setVisible] = useState(manual); const trigger = useRef<HTMLElement | null>(null);
  useEffect(() => { if (!topic) return; trigger.current = document.activeElement as HTMLElement; const state = readGuidanceState(window.localStorage); setVisible(manual || state.dismissedTopicVersions[topic.id] !== topic.version); }, [manual, topic]);
  useEffect(() => { if (!manual || !visible) return; const close = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); });
  if (!topic || !visible) return null;
  const dismiss = () => { const state = readGuidanceState(window.localStorage); writeGuidanceState({ ...state, dismissedTopicVersions: { ...state.dismissedTopicVersions, [topic.id]: topic.version } }, window.localStorage); setVisible(false); onClose?.(); if (manual) trigger.current?.focus(); };
  return <aside className="context-note" aria-labelledby={`context-${topic.id}`}><button type="button" className="context-note__close" aria-label="Đóng gợi ý" onClick={dismiss}>×</button><h2 id={`context-${topic.id}`}>{topic.title}</h2><p>{getHelpExcerpt(topic.id, "contextual", role) ?? topic.summary}</p><div className="context-note__actions"><a className="btn btn-secondary" href={`/help#${topic.id}`}>Tìm hiểu thêm</a><button type="button" className="btn btn-secondary" onClick={dismiss}>Đã hiểu</button></div>{children}</aside>;
}
