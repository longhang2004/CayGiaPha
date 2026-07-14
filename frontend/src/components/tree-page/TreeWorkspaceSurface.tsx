import { ReactNode, useEffect, useState } from "react";
import { Person, Relationship } from "@/lib/graph";
import { Address } from "@/lib/graph";
import { TreeWorkspaceViewMode, readTreeWorkspaceViewMode, writeTreeWorkspaceViewMode } from "@/lib/tree-workspace/viewMode";
import { TreeWorkspaceViewSwitcher } from "./TreeWorkspaceViewSwitcher";
import { TreeFocusView } from "./TreeFocusView";
import { TreePeopleListView } from "./TreePeopleListView";

export interface TreeWorkspaceSurfaceProps {
  persons: Person[];
  relationships: Relationship[];
  addresses: Map<string, Address>;
  egoId: string;
  selectedId: string | null;
  onSelectPerson: (id: string) => void;
  onChangeEgo: (id: string) => void;
  addressLoading?: boolean;
  graphContent: ReactNode; // We pass the TreeGraph as a prop to keep it decoupled
}

export function TreeWorkspaceSurface({
  persons,
  relationships,
  addresses,
  egoId,
  selectedId,
  onSelectPerson,
  onChangeEgo,
  addressLoading,
  graphContent,
}: TreeWorkspaceSurfaceProps) {
  const [viewMode, setViewMode] = useState<TreeWorkspaceViewMode>("focus");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setViewMode(readTreeWorkspaceViewMode(undefined, "focus"));
    setMounted(true);
  }, []);

  const handleChangeView = (mode: TreeWorkspaceViewMode) => {
    setViewMode(mode);
    writeTreeWorkspaceViewMode(mode);
  };

  // Only render switcher and content after mount to avoid hydration mismatch
  if (!mounted) {
    return <div className="tree-workspace-surface" style={{ height: "100%", width: "100%", position: "relative" }} />;
  }

  return (
    <div className="tree-workspace-surface" style={{ height: "100%", width: "100%", position: "relative", display: "flex", flexDirection: "column" }}>
      <div className="tree-workspace-surface__header">
        <TreeWorkspaceViewSwitcher currentView={viewMode} onChangeView={handleChangeView} />
      </div>

      <div
        className="tree-workspace-surface__content"
        id={`panel-${viewMode}`}
        role="tabpanel"
        aria-labelledby={`tab-${viewMode}`}
        style={{ flex: 1, minHeight: 0, overflow: "hidden", paddingTop: "6.5rem" }}
      >
        {viewMode === "focus" && (
          <TreeFocusView
            persons={persons}
            relationships={relationships}
            addresses={addresses}
            egoId={egoId}
            selectedId={selectedId}
            onSelectPerson={onSelectPerson}
            onChangeEgo={onChangeEgo}
            addressLoading={addressLoading}
          />
        )}
        {viewMode === "list" && (
          <TreePeopleListView
            persons={persons}
            addresses={addresses}
            egoId={egoId}
            selectedId={selectedId}
            onSelectPerson={(id) => {
              onSelectPerson(id);
              handleChangeView("focus"); // Automatically switch to focus mode
            }}
            onChangeEgo={onChangeEgo}
            addressLoading={addressLoading}
          />
        )}
        {viewMode === "graph" && (
          <div style={{ height: "100%", width: "100%" }}>
            {graphContent}
          </div>
        )}
      </div>
    </div>
  );
}
