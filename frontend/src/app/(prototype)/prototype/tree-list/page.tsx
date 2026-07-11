"use client";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { GuidanceChecklist } from "@/components/guidance/GuidanceChecklist";
import { DEFAULT_GUIDANCE_STATE, GUIDANCE_STORAGE_KEY } from "@/lib/guidance/storage";

export default function PrototypeTreeListPage() {
  const params = useSearchParams();
  const completed = params.get("state") === "completed";
  const state = params.get("state");
  const hasTree = params.get("trees") !== "none";
  const storage = useMemo(() => {
    const saved = { ...DEFAULT_GUIDANCE_STATE, collapsed: state === "collapsed" || state === "completed", skipped: state === "skipped", hidden: state === "hidden" };
    let value = JSON.stringify(saved);
    return { getItem: (key: string) => key === GUIDANCE_STORAGE_KEY ? value : null, setItem: (key: string, next: string) => { if (key === GUIDANCE_STORAGE_KEY) value = next; }, length: 0, clear: () => {}, key: () => null, removeItem: () => {} } as Storage;
  }, [state]);
  return <main className="tree-list-page">
    <div className="tree-list-page__header"><div><p className="eyebrow">Không gian gia đình</p><h1>Cây gia phả của bạn</h1><p>Prototype dùng dữ liệu hư cấu, không gọi API.</p></div><button type="button" className="btn btn-primary btn-terracotta">+ Tạo cây mới</button></div>
    <GuidanceChecklist storage={storage} role="owner" productState={{ treeOpened: completed, personCount: completed ? 2 : 0, primitiveCount: completed ? 1 : 0, addressInspected: completed, viewpointChanged: completed }} />
    <div className="tree-list-page__grid">{hasTree ? <div className="surface-card tree-list-card"><div className="tree-list-card__main"><h3>Gia phả mẫu</h3><div className="tree-list-card__meta"><span>Vai trò: <strong>Chủ cây</strong></span><span>Phương ngữ: <strong>Nam</strong></span></div></div><div className="tree-list-card__actions"><button type="button" className="btn btn-primary btn-terracotta">Xem sơ đồ</button></div></div> : <div className="surface-card tree-list-page__empty"><p>Bạn chưa có cây gia phả nào.</p><p>Chọn Tạo cây mới để bắt đầu.</p></div>}</div>
  </main>;
}
