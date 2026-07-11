"use client";
import { useEffect, useMemo, useState } from "react";
import { getHelpExcerpt, type GuidanceRole } from "@/content/help/helpTopics";
import { getEligibleChecklist, type GuidanceProductState } from "@/lib/guidance/checklist";
import { DEFAULT_GUIDANCE_STATE, readGuidanceState, writeGuidanceState, type GuidanceState } from "@/lib/guidance/storage";

interface Props { role: GuidanceRole; productState: GuidanceProductState; mode?: "overview" | "compact"; storage?: Storage; }
export function GuidanceChecklist({ role, productState, mode = "overview", storage }: Props) {
  const [state, setState] = useState<GuidanceState>(DEFAULT_GUIDANCE_STATE);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState(0);
  useEffect(() => { setState(readGuidanceState(storage ?? window.localStorage)); setReady(true); }, [storage]);
  const items = useMemo(() => getEligibleChecklist(role, productState), [role, productState]);
  const productCompleted = useMemo(() => items.filter(i => i.complete(productState)).map(i => i.id), [items, productState]);
  const completionKey = productCompleted.join("|");
  const completed = new Set([...state.completed, ...productCompleted]);
  useEffect(() => {
    if (!ready) return;
    setState(current => {
      if (productCompleted.every(id => current.completed.includes(id))) return current;
      const next = { ...current, completed: Array.from(new Set([...current.completed, ...productCompleted])) };
      writeGuidanceState(next, storage ?? window.localStorage);
      return next;
    });
  }, [ready, completionKey, productCompleted, storage]);
  const update = (patch: Partial<GuidanceState>) => { const next = { ...state, ...patch }; setState(next); writeGuidanceState(next, storage ?? window.localStorage); };
  if (!ready || state.hidden) return <button type="button" className="guidance-reopen" onClick={() => update({ hidden: false, skipped: false, collapsed: false })}>Xem hướng dẫn bắt đầu</button>;
  const nextItem = items.find(i => !completed.has(i.id));
  if (state.collapsed || state.skipped) return <section className="guidance-card guidance-card--collapsed" aria-label="Hướng dẫn bắt đầu"><span>{nextItem ? `Bước tiếp theo: ${nextItem.title}` : "Bạn đã hoàn tất các bước bắt đầu"}</span><button type="button" className="btn btn-secondary" onClick={() => update({ collapsed: false, skipped: false })}>Mở hướng dẫn</button></section>;
  return <section className={`guidance-card guidance-card--${mode}`} aria-labelledby="guidance-title">
    <div className="guidance-card__header"><div><h2 id="guidance-title">Bắt đầu từng bước</h2><p>{getHelpExcerpt("tao-hoac-mo-cay", "overview", role)}</p></div><button type="button" className="guidance-card__close" aria-label="Thu gọn hướng dẫn" onClick={() => update({ collapsed: true })}>×</button></div>
    <p className="sr-only" aria-live="polite">{productCompleted.length ? `Đã hoàn tất ${productCompleted.length} bước.` : ""}</p>
    <ol className="guidance-checklist">{items.slice(page * 2, (page + 1) * 2).map(item => <li key={item.id} className={completed.has(item.id) ? "is-complete" : ""}><span aria-hidden="true">{completed.has(item.id) ? "✓" : "○"}</span><div><strong>{item.title}</strong><p>{getHelpExcerpt(item.topicId, "checklist", role)}</p><a href={`/help#${item.topicId}`}>Xem cách làm</a></div></li>)}</ol>
    {items.length > 2 && (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <button type="button" className="btn btn-secondary" style={{ padding: "0.4rem 1rem", minHeight: "auto", height: "auto" }} disabled={page === 0} onClick={() => setPage(p => p - 1)}>Trước</button>
        <span style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>Trang {page + 1} / {Math.ceil(items.length / 2)}</span>
        <button type="button" className="btn btn-secondary" style={{ padding: "0.4rem 1rem", minHeight: "auto", height: "auto" }} disabled={page === Math.ceil(items.length / 2) - 1} onClick={() => setPage(p => p + 1)}>Tiếp</button>
      </div>
    )}
    <div className="guidance-card__actions"><button type="button" className="btn btn-secondary" onClick={() => update({ skipped: true, collapsed: true })}>Để sau</button><button type="button" className="btn btn-secondary" onClick={() => update({ hidden: true })}>Ẩn hướng dẫn bắt đầu</button></div>
  </section>;
}
