import { ReactNode, useEffect, useRef, useState } from "react";
import { Address, Person, Relationship, TreeAccessRole } from "@/lib/graph";
import { TreeWorkspaceViewMode, readTreeWorkspaceViewMode, writeTreeWorkspaceViewMode } from "@/lib/tree-workspace/viewMode";
import { TreeWorkspaceViewSwitcher } from "./TreeWorkspaceViewSwitcher";
import { TreePeopleListView } from "./TreePeopleListView";

export interface TreeWorkspaceSurfaceProps {
  persons: Person[];
  relationships: Relationship[];
  addresses: Map<string, Address>;
  egoId: string;
  selectedId: string | null;
  onSelectPerson: (id: string) => void;
  accessRole: TreeAccessRole;
  graphContent: ReactNode; // We pass the TreeGraph as a prop to keep it decoupled
}

export function TreeWorkspaceSurface({
  persons,
  relationships,
  addresses,
  egoId,
  selectedId,
  onSelectPerson,
  accessRole,
  graphContent,
}: TreeWorkspaceSurfaceProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<TreeWorkspaceViewMode>("list");
  const [isSplitView, setIsSplitView] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setViewMode(readTreeWorkspaceViewMode(undefined, "list"));
    setMounted(true);
  }, []);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      setIsSplitView(entry.contentRect.width >= 960);
    });
    observer.observe(surface);
    return () => observer.disconnect();
  }, [mounted]);

  const handleChangeView = (mode: TreeWorkspaceViewMode) => {
    setViewMode(mode);
    writeTreeWorkspaceViewMode(mode);
  };

  // Only render switcher and content after mount to avoid hydration mismatch
  if (!mounted) {
    return <div className="tree-workspace-surface" />;
  }

  return (
    <div
      ref={surfaceRef}
      className="tree-workspace-surface"
      data-view-mode={viewMode}
      data-layout={isSplitView ? "split" : "tabs"}
    >
      {!isSplitView ? (
        <div className="tree-workspace-surface__header" data-graph-safe-exclude="auto-y">
          <TreeWorkspaceViewSwitcher currentView={viewMode} onChangeView={handleChangeView} />
        </div>
      ) : null}

      <div className="tree-workspace-surface__panels">
        <section
          className="tree-workspace-surface__panel tree-workspace-surface__panel--list"
          id="panel-list"
          role={isSplitView ? "region" : "tabpanel"}
          aria-label={isSplitView ? "Danh sách thành viên" : undefined}
          aria-labelledby={isSplitView ? undefined : "tab-list"}
          aria-hidden={!isSplitView && viewMode !== "list" ? true : undefined}
          inert={!isSplitView && viewMode !== "list" ? ("" as unknown as boolean) : undefined}
        >
          <TreePeopleListView
            persons={persons}
            relationships={relationships}
            addresses={addresses}
            egoId={egoId}
            selectedId={selectedId}
            onSelectPerson={onSelectPerson}
            accessRole={accessRole}
          />
        </section>
        <section
          className="tree-workspace-surface__panel tree-workspace-surface__panel--graph"
          id="panel-graph"
          role={isSplitView ? "region" : "tabpanel"}
          aria-label={isSplitView ? "Sơ đồ gia phả" : undefined}
          aria-labelledby={isSplitView ? undefined : "tab-graph"}
          aria-hidden={!isSplitView && viewMode !== "graph" ? true : undefined}
          inert={!isSplitView && viewMode !== "graph" ? ("" as unknown as boolean) : undefined}
        >
          {graphContent}
        </section>
      </div>
    </div>
  );
}
