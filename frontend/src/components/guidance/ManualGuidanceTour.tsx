"use client";

import { useEffect, useRef } from "react";
import { getHelpExcerpt, getHelpTopic, type GuidanceRole } from "@/content/help/helpTopics";
import { useGraphOverlay } from "./GraphOverlayBoundary";

const TOPIC_ANCHORS: Record<string, string> = {
  "tao-hoac-mo-cay": "graph-navigation",
  "them-nguoi-dau-tien": "graph-add-person",
  "them-quan-he-ro-rang": "graph-person-node",
  "xem-thong-tin-va-xung-ho": "graph-person-node",
  "doi-diem-nhin": "graph-viewpoint",
  "dieu-huong-so-do": "graph-navigation",
  "doc-duong-quan-he": "graph-legend",
};

interface Props {
  topicId: string;
  role: GuidanceRole;
  onClose: () => void;
  anchorOverride?: string;
}

export function ManualGuidanceTour({ topicId, role, onClose, anchorOverride }: Props) {
  const topic = getHelpTopic(topicId, role);
  const { safeRect, getPlacement } = useGraphOverlay();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const anchorId = anchorOverride ?? TOPIC_ANCHORS[topicId] ?? "graph-navigation";
  const placement = getPlacement(anchorId, anchorId === "graph-navigation" ? "left" : "bottom");
  const mobile = safeRect.width < 520;

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement;
    closeButtonRef.current?.focus();
    placement.target?.setAttribute("data-guidance-highlight", "true");
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      placement.target?.removeAttribute("data-guidance-highlight");
      window.removeEventListener("keydown", handleKey);
      previousFocus.current?.focus();
    };
  }, [onClose, placement.target]);

  if (!topic) return null;
  const style = mobile ? undefined : placement.style;
  return (
    <section
      className={`guidance-tour ${mobile ? "guidance-tour--mobile" : ""}`}
      style={style}
      role="dialog"
      aria-modal="false"
      aria-labelledby="guidance-tour-title"
      data-fallback={placement.fallback ? "true" : undefined}
    >
      <button ref={closeButtonRef} type="button" className="guidance-tour__close" onClick={onClose} aria-label="Đóng hướng dẫn">×</button>
      <p className="guidance-tour__eyebrow">Chỉ dẫn thao tác</p>
      <h2 id="guidance-tour-title">{topic.title}</h2>
      <p>{getHelpExcerpt(topic.id, "contextual", role) ?? topic.summary}</p>
      {placement.fallback ? <p className="guidance-tour__fallback">Control này chưa có trên màn hình hiện tại. Bạn vẫn có thể đọc các bước chi tiết.</p> : null}
      <div className="guidance-tour__actions">
        <a className="btn btn-secondary" href={`/help#${topic.id}`}>Xem cách làm</a>
        <button type="button" className="btn btn-primary btn-terracotta" onClick={onClose}>Đã hiểu</button>
      </div>
    </section>
  );
}
