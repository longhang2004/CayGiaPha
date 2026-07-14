import { useEffect, useRef } from "react";
import { TreeWorkspaceViewMode } from "@/lib/tree-workspace/viewMode";

export interface TreeWorkspaceViewSwitcherProps {
  currentView: TreeWorkspaceViewMode;
  onChangeView: (view: TreeWorkspaceViewMode) => void;
}

export function TreeWorkspaceViewSwitcher({ currentView, onChangeView }: TreeWorkspaceViewSwitcherProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const views: TreeWorkspaceViewMode[] = ["focus", "list", "graph"];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = views.indexOf(currentView);
    let nextIndex = currentIndex;

    switch (e.key) {
      case "ArrowRight":
        nextIndex = (currentIndex + 1) % views.length;
        e.preventDefault();
        break;
      case "ArrowLeft":
        nextIndex = (currentIndex - 1 + views.length) % views.length;
        e.preventDefault();
        break;
      case "Home":
        nextIndex = 0;
        e.preventDefault();
        break;
      case "End":
        nextIndex = views.length - 1;
        e.preventDefault();
        break;
      default:
        return;
    }

    const nextView = views[nextIndex];
    onChangeView(nextView);

    // Focus the newly selected tab button
    setTimeout(() => {
      const buttons = containerRef.current?.querySelectorAll<HTMLButtonElement>("button");
      buttons?.[nextIndex]?.focus();
    }, 0);
  };

  return (
    <div
      ref={containerRef}
      className="view-switcher"
      role="tablist"
      aria-label="Chọn chế độ xem"
      onKeyDown={handleKeyDown}
    >
      <button
        role="tab"
        id="tab-focus"
        aria-controls="panel-focus"
        aria-selected={currentView === "focus"}
        tabIndex={currentView === "focus" ? 0 : -1}
        className={`btn ${currentView === "focus" ? "btn-primary" : "btn-ghost"}`}
        onClick={() => onChangeView("focus")}
      >
        Một người
      </button>
      <button
        role="tab"
        id="tab-list"
        aria-controls="panel-list"
        aria-selected={currentView === "list"}
        tabIndex={currentView === "list" ? 0 : -1}
        className={`btn ${currentView === "list" ? "btn-primary" : "btn-ghost"}`}
        onClick={() => onChangeView("list")}
      >
        Danh sách
      </button>
      <button
        role="tab"
        id="tab-graph"
        aria-controls="panel-graph"
        aria-selected={currentView === "graph"}
        tabIndex={currentView === "graph" ? 0 : -1}
        className={`btn ${currentView === "graph" ? "btn-primary" : "btn-ghost"}`}
        onClick={() => onChangeView("graph")}
      >
        Sơ đồ
      </button>
    </div>
  );
}
