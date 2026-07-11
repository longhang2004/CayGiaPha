"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useSession } from "@/app/providers";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/FormControls";
import { TreeGraph } from "@/components/graph/TreeGraph";
import { GraphLegend } from "@/components/graph/GraphLegend";
import { PersonForm } from "@/components/person/PersonForm";
import { AddRelativeForm } from "@/components/person/AddRelativeForm";
import { DeletionDialog } from "@/components/deletion/DeletionDialog";
import { SearchPanel } from "@/components/search/SearchPanel";
import { RegionSelector } from "@/components/region/RegionSelector";
import { PersonPhotos } from "@/components/photos/PersonPhotos";
import { TextSizeControl } from "@/components/a11y/TextSizeControl";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { PersonInfoPanel } from "@/components/graph/PersonInfoPanel";
import { ViewpointSelector } from "@/components/graph/ViewpointSelector";
import { TreeGraphSkeleton } from "@/components/graph/TreeGraphSkeleton";
import { UpcomingEventsWidget } from "@/components/graph/UpcomingEventsWidget";
import { Button } from "@/components/Button";
import { GuidanceChecklist } from "@/components/guidance/GuidanceChecklist";
import { ContextNote } from "@/components/guidance/ContextNote";
import { api, ApiError } from "@/lib/apiClient";
import type { Person, Relationship, Address } from "@/lib/graph";
import type { Region } from "@/lib/region";
import { getCollaborators, type TreeCollaborator } from "@/lib/collaboration";
import { CollaborationModal } from "@/components/collaboration/CollaborationModal";
import { SettingsModal } from "@/components/tree/SettingsModal";
import "@/components/graph/graph.css";
import { CollaborationIcon, PlusIcon, CloseIcon } from "@/components/ui/Icons";

interface TreePageProps {
  params: {
    id: string;
  };
  searchParams: {
    shareToken?: string;
  };
}

function TreePageContent({ params, searchParams }: TreePageProps) {
  const { user, loading: sessionLoading } = useSession();
  const router = useRouter();
  const nextSearchParams = useSearchParams();
  const pathname = usePathname();

  const activeTreeId = params.id;
  const [persons, setPersons] = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [region, setRegionState] = useState<Region>("Bac");
  const [livingRedaction, setLivingRedaction] = useState(true);
  const [sharing, setSharing] = useState("private");
  const [treeName, setTreeName] = useState("Cây Gia Phả");

  const [loadingData, setLoadingData] = useState(true);
  const [addressesReady, setAddressesReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | undefined>(undefined);
  const [addresses, setAddresses] = useState<Map<string, Address>>(new Map());
  const [selectedEgo, setSelectedEgo] = useState<Person | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [addRelativeMode, setAddRelativeMode] = useState(false);
  const [createMode, setCreateMode] = useState(false);

  const [addressLoading, setAddressLoading] = useState(false);
  const [egoId, setEgoId] = useState<string>("");
  const [addressRefreshKey, setAddressRefreshKey] = useState(0);
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    if (persons.length > 0 && !egoId) {
      setEgoId(persons[0].id);
    }
  }, [persons, egoId]);

  useEffect(() => {
    if (egoId) {
      setAddressesReady(false);
    }
  }, [egoId]);

  const [shareToken, setShareToken] = useState<string | null>(searchParams.shareToken || null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCollaborationOpen, setIsCollaborationOpen] = useState(false);
  const [showBirthYears, setShowBirthYears] = useState(true);
  const [collaborators, setCollaborators] = useState<TreeCollaborator[]>([]);

  useEffect(() => {
    let cancelled = false;

    if (!activeTreeId || !user?.userId) {
      setCollaborators([]);
      return;
    }

    getCollaborators(activeTreeId)
      .then((result) => {
        if (!cancelled) {
          setCollaborators(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCollaborators([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeTreeId, user?.userId]);

  const handleCloseCollaboration = () => {
    setIsCollaborationOpen(false);
  };

  useEffect(() => {
    if (nextSearchParams.get("settings") === "true") {
      setIsSettingsOpen(true);
    }
  }, [nextSearchParams]);

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
    const params = new URLSearchParams(nextSearchParams.toString());
    params.delete("settings");
    const query = params.toString() ? `?${params.toString()}` : "";
    router.replace(`${pathname}${query}`);
  };

  const { showToast } = useToast();

  const loadTree = useCallback(async (id: string, token?: string) => {
    setLoadingData(true);
    setAddressesReady(false);
    setError(null);
    try {
      const data = await api.get<{
        persons: Person[];
        relationships: Relationship[];
        region: Region;
        livingRedaction: boolean;
        sharing: string;
        name: string;
      }>(`/trees/${encodeURIComponent(id)}`, {
        headers: token ? { "X-Share-Token": token } : undefined,
      });
      setPersons(data.persons);
      setRelationships(data.relationships);
      setRegionState(data.region);
      setLivingRedaction(data.livingRedaction);
      setSharing(data.sharing);
      setTreeName(data.name || "Cây Gia Phả");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          router.push("/");
          return;
        }
        setError(err.message);
      } else {
        setError("Không thể tải sơ đồ gia phả. Vui lòng thử lại.");
      }
    } finally {
      setLoadingData(false);
    }
  }, [router]);

  useEffect(() => {
    // Read share token from hash fragment (preferred) or legacy query param.
    if (typeof window !== "undefined") {
      const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, "")).get(
        "shareToken",
      );
      if (fromHash) {
        setShareToken(fromHash);
        // Drop query-string token from the address bar if present.
        if (searchParams.shareToken) {
          const url = new URL(window.location.href);
          url.searchParams.delete("shareToken");
          window.history.replaceState({}, "", url.pathname + url.search + url.hash);
        }
      }
    }
  }, [searchParams.shareToken]);

  useEffect(() => {
    if (activeTreeId) {
      loadTree(activeTreeId, shareToken || undefined);
    } else if (!sessionLoading) {
      setLoadingData(false);
    }
  }, [activeTreeId, shareToken, sessionLoading, loadTree]);

  const refreshTree = useCallback(() => {
    if (activeTreeId) {
      loadTree(activeTreeId, shareToken || undefined);
    }
  }, [activeTreeId, shareToken, loadTree]);

  const handleAddressesLoaded = useCallback((loaded: Map<string, Address>) => {
    setAddresses(loaded);
    setAddressesReady(true);
  }, []);

  const isSessionOrDataLoading = sessionLoading || (loadingData && persons.length === 0);
  // Show full-screen spinner for the initial data + address load.
  // When persons are already loaded but addresses haven't been fetched yet,
  // we render the tree in the background (hidden) so TreeGraph can mount and
  // fire its address fetch, then remove the overlay once addresses are ready.
  const showLoadingOverlay = isSessionOrDataLoading || (persons.length > 0 && !addressesReady);

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
        <ContextNote topicId="them-nguoi-dau-tien" role="owner" />
        <div className="onboarding-strip" aria-label="Các bước gợi ý" style={{ display: "flex", justifyContent: "center", gap: "1rem", marginBottom: "2rem", fontSize: "0.9rem", fontWeight: 600, color: "var(--color-brand)" }}>
          <span>1. Nhập tên</span>
          <span style={{ color: "var(--color-hairline)" }}>—</span>
          <span>2. Chọn giới tính</span>
          <span style={{ color: "var(--color-hairline)" }}>—</span>
          <span>3. Bấm lưu</span>
        </div>
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

  const selectedPerson = selectedId ? persons.find((p) => p.id === selectedId) : null;
  const selectedSpouseRelationship = selectedPerson
    ? relationships.find((r) => r.type === "marriage" && (r.sourceId === selectedPerson.id || r.targetId === selectedPerson.id))
    : undefined;
  const selectedSpouseId = selectedSpouseRelationship && selectedPerson
    ? (selectedSpouseRelationship.sourceId === selectedPerson.id
      ? selectedSpouseRelationship.targetId
      : selectedSpouseRelationship.sourceId)
    : undefined;
  const isOwner = user?.treeId === activeTreeId;
  const isCollaborator = collaborators.some((collaborator) => collaborator.userId === user?.userId);
  const canEdit = isOwner || isCollaborator;
  const guidanceRole = isOwner ? "owner" : canEdit ? "editor" : "reader";
  const primitiveCount = relationships.filter((relationship) => relationship.type === "bloodline_father" || relationship.type === "bloodline_mother" || relationship.type === "marriage").length;
  const guidanceProductState = {
    treeOpened: true,
    personCount: persons.length,
    primitiveCount,
    addressInspected: Boolean(selectedId && addressesReady && (selectedAddress || addresses.has(selectedId))),
    viewpointChanged: Boolean(egoId && egoId !== persons[0]?.id && addressesReady),
  };

  // Map person option for relation dropdown selection
  const personOptions = persons.map((p) => ({ id: p.id, displayName: p.displayName, gender: p.gender }));

  // Map selected person's initial values for the edit form
  const selectedInitialValues = selectedPerson
    ? {
        displayName: selectedPerson.displayName,
        gender: selectedPerson.gender,
        birthOrder: selectedPerson.birthOrder ?? undefined,
        birthYear: selectedPerson.birthYear ?? undefined,
        deathStatus: selectedPerson.deceased ?? false,
        deathDay: selectedPerson.deathDay ?? undefined,
        deathMonth: selectedPerson.deathMonth ?? undefined,
        deathYear: selectedPerson.deathYear ?? undefined,
        deathCalendar: selectedPerson.deathCalendar ?? undefined,
        deathLunarLeap: selectedPerson.deathLunarLeap ?? undefined,
      }
    : undefined;

  // Panel open state for slide-in effect
  const isPanelOpen = !!(createMode || selectedPerson || addRelativeMode);

  return (
    <>
      {showLoadingOverlay && (
        <div className="full-screen-loader" role="status" aria-live="polite">
          <div className="full-screen-loader__spinner" />
          <p className="full-screen-loader__text">Đang tải dữ liệu gia phả…</p>
        </div>
      )}
    <section className="tree-workspace" style={showLoadingOverlay ? { visibility: "hidden" } : undefined}>

      <div className="tree-workspace__layout">
        <div className="tree-workspace__guidance">
          <GuidanceChecklist role={guidanceRole} productState={guidanceProductState} mode="compact" />
          <ContextNote topicId={selectedId ? "doi-diem-nhin" : "dieu-huong-so-do"} role={guidanceRole} />
        </div>

        {/* Floating Island Header/Toolbar */}
        <div className="tree-page-header">
          <div className="tree-page-header__row-one">
            {/* Brand — hidden on tablet/mobile via CSS */}
            <div className="tree-page-header__brand">
              <img src="/logo.svg" alt="Logo Cây Gia Phả" className="tree-page-header__logo" />
              <div className="tree-page-header__title-container">
                <h1 className="tree-page-header__title">{treeName}</h1>
                <span className="tree-page-header__count">{persons.length} thành viên</span>
              </div>
            </div>

            {/* Search — grows to fill space */}
            <div className="tree-page-header__search-container">
              <SearchPanel
                treeId={activeTreeId}
                persons={persons}
                addresses={addresses}
                egoId={egoId}
                viewpointId={selectedId || undefined}
                onSelectResult={(id) => {
                  setSelectedId(id);
                  setEditMode(false);
                  setAddRelativeMode(false);
                }}
              />
            </div>

            {/* Viewpoint — inline on desktop, hidden on tablet (moved to row-two) */}
            <div className="tree-page-header__viewpoint-inline">
              <ViewpointSelector
                persons={persons}
                egoId={egoId}
                onChange={setEgoId}
                disabled={addressLoading}
              />
            </div>

            {/* Actions */}
            <div className="tree-page-header__actions">
              <GraphLegend />
              {user && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCollaborationOpen(true)}
                  title="Cộng tác"
                  aria-label="Cộng tác"
                >
                  <CollaborationIcon size={18} />
                  <span className="hide-on-tablet hide-on-mobile">Cộng tác</span>
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  className="btn btn-primary btn-terracotta"
                  onClick={() => {
                    setSelectedId(null);
                    setCreateMode(true);
                    setAddRelativeMode(false);
                    setEditMode(false);
                  }}
                  title="Thêm thành viên"
                  aria-label="Thêm thành viên"
                >
                  <PlusIcon size={18} />
                  <span className="hide-on-tablet hide-on-mobile">Thêm thành viên</span>
                </button>
              )}
            </div>
          </div>

          {/* Row 2 — viewpoint on tablet/mobile only (hidden on desktop via CSS) */}
          <div className="tree-page-header__row-two">
            <div className="tree-page-header__viewpoint">
              <ViewpointSelector
                persons={persons}
                egoId={egoId}
                onChange={setEgoId}
                disabled={addressLoading}
              />
            </div>
          </div>
        </div>

        {/* Left/Center: Main Graph */}
        <div className="tree-workspace__main">
          {/* Interactive SVG graph area */}
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

        {/* Right Side: Member Details and Actions Panel */}
        <div className={`tree-workspace__info-panel ${isPanelOpen ? "tree-workspace__info-panel--open" : ""}`}>
          {createMode ? (
            <div className="surface-card side-panel" style={{ position: "relative" }}>
              <button
                type="button"
                className="side-panel__close"
                onClick={() => setCreateMode(false)}
                aria-label="Hủy"
              >
                <CloseIcon size={20} />
              </button>
              <h3 className="side-panel__title">Thêm thành viên mới</h3>
              <PersonForm
                mode="create"
                treeId={activeTreeId}
                persons={personOptions}
                onSuccess={() => {
                  setCreateMode(false);
                  refreshTree();
                }}
                onCancel={() => setCreateMode(false)}
                hideCancelButton={true}
              />
            </div>
          ) : selectedPerson ? (
            <div className="surface-card side-panel" style={{ position: "relative" }}>
              <button
                type="button"
                className="side-panel__close"
                onClick={() => {
                  if (editMode) setEditMode(false);
                  else if (addRelativeMode) setAddRelativeMode(false);
                  else setSelectedId(null);
                }}
                aria-label="Bỏ chọn"
              >
                <CloseIcon size={20} />
              </button>

              {(editMode || addRelativeMode) && (
                <h3 className="side-panel__title">
                  {selectedPerson.displayName}
                </h3>
              )}

              {editMode ? (
                <div>
                  <h4 style={{ margin: "1rem 0" }}>Chỉnh sửa thông tin</h4>
                  <PersonForm
                    mode="edit"
                    treeId={activeTreeId}
                    personId={selectedPerson.id}
                    initialValues={selectedInitialValues}
                    spouseRelationship={selectedSpouseId ? {
                      spouseId: selectedSpouseId,
                      maritalStatus: selectedSpouseRelationship?.maritalStatus,
                    } : undefined}
                    onSuccess={() => {
                      setEditMode(false);
                      refreshTree();
                    }}
                    onCancel={() => setEditMode(false)}
                    hideCancelButton={true}
                  />
                </div>
              ) : addRelativeMode ? (
                <div>
                  <h4 style={{ margin: "1rem 0" }}>Thêm kết nối cho {selectedPerson.displayName}</h4>
                  <AddRelativeForm
                    treeId={activeTreeId}
                    persons={personOptions}
                    preselectedPersonId={selectedPerson.id}
                    onCreated={() => {
                      setAddRelativeMode(false);
                      refreshTree();
                    }}
                    onCancel={() => setAddRelativeMode(false)}
                    hideCancelButton={true}
                  />
                </div>
              ) : (
                <div>
                  <PersonInfoPanel
                    person={selectedPerson}
                    ego={selectedEgo}
                    address={selectedAddress}
                    loading={addressLoading}
                    hideHeading={true}
                  />

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
                    {canEdit && (
                      <div className="person-actions">
                        <button
                          type="button"
                          className="btn"
                          onClick={() => setEditMode(true)}
                        >
                          Chỉnh sửa thông tin
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setAddRelativeMode(true)}
                        >
                          Thêm quan hệ
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setEgoId(selectedPerson.id)}
                          disabled={egoId === selectedPerson.id || addressLoading}
                        >
                          {egoId === selectedPerson.id ? "Đang là góc nhìn" : "Chuyển góc nhìn này"}
                        </button>
                        <DeletionDialog
                          treeId={activeTreeId}
                          personId={selectedPerson.id}
                          triggerLabel="Xóa thành viên này"
                          className="btn-danger"
                          onDeleted={() => {
                            setSelectedId(null);
                            refreshTree();
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--color-hairline-soft)", paddingTop: "1rem" }}>
                    <PersonPhotos
                      treeId={activeTreeId}
                      personId={selectedPerson.id}
                      canEdit={isOwner}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : addRelativeMode ? (
            <div className="surface-card side-panel" style={{ position: "relative" }}>
              <button
                type="button"
                className="side-panel__close"
                onClick={() => setAddRelativeMode(false)}
                aria-label="Hủy"
              >
                <CloseIcon size={20} />
              </button>
              <h3 className="side-panel__title">Thêm kết nối mới</h3>
              <AddRelativeForm
                treeId={activeTreeId}
                persons={personOptions}
                onCreated={() => {
                  setAddRelativeMode(false);
                  refreshTree();
                }}
                hideCancelButton={true}
              />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="surface-card side-panel">
                <p style={{ color: "var(--color-muted)", margin: 0, textAlign: "center" }}>
                  Chọn một người để xem thông tin và cách xưng hô.
                </p>
              </div>
              <UpcomingEventsWidget treeId={activeTreeId} />
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal (Cài đặt) */}
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

      {/* Collaboration Modal (Cộng tác) */}
      <CollaborationModal
        isOpen={isCollaborationOpen}
        onClose={handleCloseCollaboration}
        treeId={activeTreeId}
        isOwner={isOwner}
      />
    </section>
    </>
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
