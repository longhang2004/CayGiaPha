"use client";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GuidanceChecklist } from "@/components/guidance/GuidanceChecklist";
import { DEFAULT_GUIDANCE_STATE, GUIDANCE_STORAGE_KEY } from "@/lib/guidance/storage";
import { EarlyAccessWelcomeDialog } from "@/components/tree/EarlyAccessWelcomeDialog";
import { TreeEntryModal, type TreeEntryMode } from "@/components/tree/TreeEntryModal";
import { TreeListView } from "@/components/tree/TreeListView";

export default function PrototypeTreeListPage() {
  const params = useSearchParams();
  const completed = params.get("state") === "completed";
  const state = params.get("state");
  const entry = params.get("entry");
  const hasTree = params.get("trees") !== "none";
  const welcomeOpen = params.get("welcome") === "open";
  const [modalOpen, setModalOpen] = useState(Boolean(entry));
  const [openedTree, setOpenedTree] = useState<string | null>(null);
  const [treeVisible, setTreeVisible] = useState(hasTree);
  const initialMode: TreeEntryMode = entry === "create" ? "create" : entry === "join" || entry === "pending" || entry === "error" ? "join" : "choose";
  const storage = useMemo(() => {
    const saved = { ...DEFAULT_GUIDANCE_STATE };
    let value = JSON.stringify(saved);
    return { getItem: (key: string) => key === GUIDANCE_STORAGE_KEY ? value : null, setItem: (key: string, next: string) => { if (key === GUIDANCE_STORAGE_KEY) value = next; }, length: 0, clear: () => {}, key: () => null, removeItem: () => {} } as Storage;
  }, []);
  return <main className="tree-list-page">
    {welcomeOpen ? <EarlyAccessWelcomeDialog forceOpen persistAcknowledgement={false} /> : null}
    <TreeListView
      trees={treeVisible ? [{ id: "prototype-tree", name: "Gia phả mẫu", region: "Nam", accessRole: "OWNER" }] : []}
      description="Prototype dùng dữ liệu hư cấu, không gọi API."
      onAddTree={() => setModalOpen(true)}
      onOpenTree={(treeId) => setOpenedTree(treeId)}
      onDeleteTree={() => setTreeVisible(false)}
      notice={openedTree ? <p role="status">Đang mở cây mẫu: {openedTree}</p> : null}
      emptyGuidance={<GuidanceChecklist initialPresentation={state === "collapsed" ? "collapsed" : state === "deferred" || state === "skipped" ? "deferred" : "expanded"} storage={storage} role="owner" productState={{ treeOpened: completed, personCount: completed ? 2 : 0, primitiveCount: completed ? 1 : 0, addressInspected: completed, viewpointChanged: completed }} />}
    />
    <TreeEntryModal
      key={entry ?? "interactive"}
      isOpen={modalOpen}
      onClose={() => setModalOpen(false)}
      initialMode={initialMode}
      initialOutcome={entry === "pending" ? "pending" : undefined}
      initialError={entry === "error" ? "Mã mời không đúng hoặc đã hết hạn." : undefined}
      onCreate={async () => ({ kind: "ready", treeId: "prototype-created-tree" })}
      onJoin={async () => entry === "pending" ? ({ kind: "pending" }) : ({ kind: "ready", treeId: "prototype-joined-tree" })}
      onTreeReady={(treeId) => { setOpenedTree(treeId); setModalOpen(false); }}
    />
  </main>;
}
