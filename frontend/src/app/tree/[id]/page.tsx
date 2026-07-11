"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { TreeGraph } from "@/components/graph/TreeGraph";
import { PersonForm } from "@/components/person/PersonForm";
import { TreeGraphSkeleton } from "@/components/graph/TreeGraphSkeleton";
import { ContextNote } from "@/components/guidance/ContextNote";
import { GraphOverlayBoundary } from "@/components/guidance/GraphOverlayBoundary";
import { GuidanceOrchestrator } from "@/components/guidance/GuidanceOrchestrator";
import { Card } from "@/components/ui/Card";
import { SettingsModal } from "@/components/tree/SettingsModal";
import { CollaborationModal } from "@/components/collaboration/CollaborationModal";
import "@/components/graph/graph.css";

import { TreeContext } from "@/components/tree-page/TreeContext";
import { useTreePageState } from "@/components/tree-page/useTreePageState";
import { TreePageHeader } from "@/components/tree-page/TreePageHeader";
import { TreePageSlidePanel } from "@/components/tree-page/TreePageSlidePanel";

interface TreePageProps {
  params: {
    id: string;
  };
  searchParams: {
    shareToken?: string;
  };
}

function TreePageContent({ params, searchParams }: TreePageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const nextSearchParams = useSearchParams();

  const treeState = useTreePageState(params.id, searchParams.shareToken || null);

  const {
    activeTreeId,
    persons,
    relationships,
    selectedId,
    egoId,
    addressRefreshKey,
    focusId,
    showBirthYears,
    isSessionOrDataLoading,
    showLoadingOverlay,
    addressesReady,
    selectedAddress,
    addresses,
    error,
    treeName,
    region,
    livingRedaction,
    sharing,
    shareToken,
    isSettingsOpen,
    isCollaborationOpen,
    isOwner,
    guidanceRole,
    setSelectedId,
    setEditMode,
    setAddRelativeMode,
    setCreateMode,
    setSelectedAddress,
    setSelectedEgo,
    setEgoId,
    setAddressLoading,
    handleAddressesLoaded,
    setFocusId,
    refreshTree,
    setIsSettingsOpen,
    setIsCollaborationOpen,
    setTreeName,
    setRegionState,
    setLivingRedaction,
    setSharing,
    setShareToken,
    setShowBirthYears,
    setAddressRefreshKey,
  } = treeState;

  // Handle URL changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("shareToken");
      if (fromHash && searchParams.shareToken) {
        const url = new URL(window.location.href);
        url.searchParams.delete("shareToken");
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      }
    }
  }, [searchParams.shareToken]);

  useEffect(() => {
    if (nextSearchParams.get("settings") === "true") {
      setIsSettingsOpen(true);
    }
  }, [nextSearchParams, setIsSettingsOpen]);

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
    const paramsUrl = new URLSearchParams(nextSearchParams.toString());
    paramsUrl.delete("settings");
    const query = paramsUrl.toString() ? `?${paramsUrl.toString()}` : "";
    router.replace(`${pathname}${query}`);
  };

  const handleCloseCollaboration = () => {
    setIsCollaborationOpen(false);
  };

  if (isSessionOrDataLoading) {
    return (
      <>
        <div className="full-screen-loader" role="status" aria-live="polite">
          <div className="full-screen-loader__spinner" />
          <p className="full-screen-loader__text">Đang tải dữ liệu gia phả…</p>
        </div>
        <TreeGraphSkeleton />
      </>
    );
  }

  if (!activeTreeId) {
    return (
      <section className="center-state">
        <h1>Cây gia phả</h1>
        <p>Bạn cần đăng nhập và có cây gia phả để xem sơ đồ.</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="center-state">
        <h1>Lỗi tải sơ đồ</h1>
        <p className="center-state__error">{error}</p>
        <button type="button" className="btn" onClick={refreshTree}>Thử lại</button>
      </section>
    );
  }

  if (persons.length === 0) {
    return (
      <section className="empty-tree" style={{ maxWidth: "600px", margin: "4rem auto", textAlign: "center" }}>
        <div className="empty-tree__intro" style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Bắt đầu cây gia phả của bạn</h1>
          <p style={{ color: "var(--color-muted)", lineHeight: 1.6 }}>
            Sơ đồ gia phả của bạn hiện chưa có thành viên nào. Hãy thêm thành viên đầu tiên
            để bắt đầu.
          </p>
        </div>
        <ContextNote topicId="them-nguoi-dau-tien" role="owner">
          <div className="onboarding-strip onboarding-strip--guidance" aria-label="Các bước gợi ý">
            <span>1. Nhập tên</span>
            <span aria-hidden="true">—</span>
            <span>2. Chọn giới tính</span>
            <span aria-hidden="true">—</span>
            <span>3. Bấm lưu</span>
          </div>
        </ContextNote>
        <Card className="empty-tree__form" style={{ padding: "2rem", textAlign: "left" }}>
          <PersonForm
            mode="create"
            treeId={activeTreeId}
            onSuccess={() => {
              refreshTree();
            }}
          />
        </Card>
      </section>
    );
  }

  const primitiveCount = relationships.filter((relationship) => relationship.type === "bloodline_father" || relationship.type === "bloodline_mother" || relationship.type === "marriage").length;
  const guidanceProductState = {
    treeOpened: true,
    personCount: persons.length,
    primitiveCount,
    addressInspected: Boolean(selectedId && addressesReady && (selectedAddress || addresses.has(selectedId))),
    viewpointChanged: Boolean(egoId && egoId !== persons[0]?.id && addressesReady),
  };

  return (
    <TreeContext.Provider value={treeState}>
      {showLoadingOverlay && (
        <div className="full-screen-loader" role="status" aria-live="polite">
          <div className="full-screen-loader__spinner" />
          <p className="full-screen-loader__text">Đang tải dữ liệu gia phả…</p>
        </div>
      )}
      <section className="tree-workspace" style={showLoadingOverlay ? { visibility: "hidden" } : undefined}>
        <GraphOverlayBoundary
          className="tree-workspace__layout"
          overlay={<GuidanceOrchestrator role={guidanceRole} productState={guidanceProductState} contextualTopicId={selectedId ? "doi-diem-nhin" : "dieu-huong-so-do"} />}
        >

          <TreePageHeader />

          <div className="tree-workspace__main">
            <div className="tree-workspace__graph">
              <TreeGraph
                treeId={activeTreeId}
                persons={persons}
                relationships={relationships}
                selectedId={selectedId}
                onSelectId={(id) => {
                  setSelectedId(id);
                  setEditMode(false);
                  setAddRelativeMode(false);
                  setCreateMode(false);
                }}
                onSelectAddress={setSelectedAddress}
                onSelectEgo={setSelectedEgo}
                egoId={egoId}
                onEgoChange={setEgoId}
                onAddressLoading={setAddressLoading}
                onAddressesLoaded={handleAddressesLoaded}
                hideViewpointSelector={true}
                addressRefreshKey={addressRefreshKey}
                focusId={focusId}
                onFocusChange={setFocusId}
                showBirthYears={showBirthYears}
              />
            </div>
          </div>

          <TreePageSlidePanel />
        </GraphOverlayBoundary>

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={handleCloseSettings}
          treeId={activeTreeId}
          isOwner={isOwner}
          treeName={treeName}
          region={region}
          livingRedaction={livingRedaction}
          sharing={sharing}
          shareToken={shareToken}
          showBirthYears={showBirthYears}
          onTreeNameChange={setTreeName}
          onRegionChange={(newRegion) => {
            setRegionState(newRegion);
            setAddressRefreshKey((k) => k + 1);
          }}
          onLivingRedactionChange={(enabled) => {
            setLivingRedaction(enabled);
            refreshTree();
          }}
          onSharingChange={(newSharing, newToken) => {
            setSharing(newSharing);
            setShareToken(newToken);
          }}
          onShowBirthYearsChange={setShowBirthYears}
        />

        <CollaborationModal
          isOpen={isCollaborationOpen}
          onClose={handleCloseCollaboration}
          treeId={activeTreeId}
          isOwner={isOwner}
        />
      </section>
    </TreeContext.Provider>
  );
}

export default function TreePage(props: TreePageProps) {
  return (
    <Suspense fallback={
      <section className="center-state" aria-live="polite">
        <div className="center-state__card">
          <span className="center-state__spinner" aria-hidden="true" />
          <p>Đang tải sơ đồ gia phả…</p>
        </div>
      </section>
    }>
      <TreePageContent {...props} />
    </Suspense>
  );
}
