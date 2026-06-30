"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useSession } from "@/app/providers";
import { TreeGraph } from "@/components/graph/TreeGraph";
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
import { api, ApiError } from "@/lib/apiClient";
import type { Person, Relationship, Address } from "@/lib/graph";
import type { Region } from "@/lib/region";
import { getCookie, setCookie } from "@/lib/cookies";
import {
  inviteCollaborator,
  getPendingInvitations,
  approveInvitation,
  rejectInvitation,
  joinTreeGroup,
  getCollaborators,
  type CollaborationInvitation,
  type TreeCollaborator
} from "@/lib/collaboration";
import "@/components/graph/graph.css";
import { LightbulbIcon } from "@/components/ui/Icons";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";

interface TreePageProps {
  searchParams: {
    treeId?: string;
    shareToken?: string;
  };
}

function TreePageContent({ searchParams }: TreePageProps) {
  const { user, loading: sessionLoading } = useSession();
  const router = useRouter();
  const nextSearchParams = useSearchParams();
  const pathname = usePathname();
  
  const queryTreeId = searchParams.treeId;
  const queryShareToken = searchParams.shareToken;
  const activeTreeId = queryTreeId || user?.treeId;

  const [persons, setPersons] = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [region, setRegionState] = useState<Region>("Bac");
  const [livingRedaction, setLivingRedaction] = useState(true);
  const [sharing, setSharing] = useState("private");
  
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
  const [overflowOpen, setOverflowOpen] = useState(false);
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

  useEffect(() => {
    setOverflowOpen(false);
  }, [selectedId]);

  const [updatingSharing, setUpdatingSharing] = useState(false);
  const [updatingRedaction, setUpdatingRedaction] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(queryShareToken || null);
  const [generatingToken, setGeneratingToken] = useState(false);

  const [showTutorial, setShowTutorial] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCollaborationOpen, setIsCollaborationOpen] = useState(false);

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

  const [collaborators, setCollaborators] = useState<TreeCollaborator[]>([]);
  const [pendingInvites, setPendingInvites] = useState<CollaborationInvitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);

  const fetchCollaborationData = useCallback(async () => {
    if (!activeTreeId || !user) return;
    setLoadingCollaborators(true);
    try {
      const collabs = await getCollaborators(activeTreeId);
      setCollaborators(collabs);
      if (user?.treeId === activeTreeId) {
        const pendings = await getPendingInvitations(activeTreeId);
        setPendingInvites(pendings);
      }
    } catch (err) {
      console.error("Failed to load collaboration data", err);
    } finally {
      setLoadingCollaborators(false);
    }
  }, [activeTreeId, user]);

  useEffect(() => {
    if (isSettingsOpen || isCollaborationOpen) {
      fetchCollaborationData();
    }
  }, [isSettingsOpen, isCollaborationOpen, fetchCollaborationData]);

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTreeId || !inviteEmail.trim()) return;
    try {
      const result = await inviteCollaborator(activeTreeId, inviteEmail.trim());
      alert(
        result.status === "sent"
          ? `Đã tạo mã mời thành công! Mã mời: ${result.code}`
          : "Đã gửi yêu cầu mời cộng tác. Đang chờ chủ cây duyệt."
      );
      setInviteEmail("");
      fetchCollaborationData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Không thể gửi lời mời.");
    }
  }

  async function handleApproveInvite(inviteId: string) {
    if (!activeTreeId) return;
    try {
      await approveInvitation(activeTreeId, inviteId);
      alert("Đã duyệt lời mời cộng tác thành công!");
      fetchCollaborationData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Thao tác thất bại.");
    }
  }

  async function handleRejectInvite(inviteId: string) {
    if (!activeTreeId) return;
    try {
      await rejectInvitation(activeTreeId, inviteId);
      alert("Đã từ chối/hủy lời mời cộng tác!");
      fetchCollaborationData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Thao tác thất bại.");
    }
  }

  async function handleJoinTree(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    try {
      await joinTreeGroup(inviteCode.trim());
      alert("Bạn đã tham gia nhóm cộng tác xây dựng cây thành công!");
      setInviteCode("");
      router.refresh();
      window.location.reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Mã mời không hợp lệ.");
    }
  }

  useEffect(() => {
    const dismissed = getCookie("tutorial_dismissed");
    if (!dismissed) {
      setShowTutorial(true);
    }
  }, []);

  const handleDismissTutorial = () => {
    setCookie("tutorial_dismissed", "true", 365);
    setShowTutorial(false);
  };

  const loadTree = useCallback(async (id: string, token?: string) => {
    setLoadingData(true);
    setAddressesReady(false);
    setError(null);
    try {
      const url = `/trees/${encodeURIComponent(id)}${token ? `?shareToken=${encodeURIComponent(token)}` : ""}`;
      const data = await api.get<{
        persons: Person[];
        relationships: Relationship[];
        region: Region;
        livingRedaction: boolean;
        sharing: string;
      }>(url);
      setPersons(data.persons);
      setRelationships(data.relationships);
      setRegionState(data.region);
      setLivingRedaction(data.livingRedaction);
      setSharing(data.sharing);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Không thể tải sơ đồ gia phả. Vui lòng thử lại.");
      }
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (activeTreeId) {
      loadTree(activeTreeId, queryShareToken);
    } else if (!sessionLoading) {
      setLoadingData(false);
    }
  }, [activeTreeId, queryShareToken, sessionLoading, loadTree]);

  const refreshTree = useCallback(() => {
    if (activeTreeId) {
      loadTree(activeTreeId, queryShareToken);
    }
  }, [activeTreeId, queryShareToken, loadTree]);

  const handleAddressesLoaded = useCallback((loaded: Map<string, Address>) => {
    setAddresses(loaded);
    setAddressesReady(true);
  }, []);

  async function handleSharingChange(nextSharing: string) {
    if (!activeTreeId) return;
    setUpdatingSharing(true);
    try {
      const result = await api.patch<{ sharing: string }>(`/trees/${activeTreeId}/sharing`, { sharing: nextSharing });
      setSharing(result.sharing);
      if (result.sharing !== "link") {
        setShareToken(null);
      }
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Không thể thay đổi cấu hình chia sẻ.");
    } finally {
      setUpdatingSharing(false);
    }
  }

  async function handleRedactionChange(enabled: boolean) {
    if (!activeTreeId) return;
    setUpdatingRedaction(true);
    try {
      const result = await api.patch<{ enabled: boolean }>(`/trees/${activeTreeId}/living-redaction`, { enabled });
      setLivingRedaction(result.enabled);
      refreshTree();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Không thể cập nhật cấu hình bảo vệ.");
    } finally {
      setUpdatingRedaction(false);
    }
  }

  async function handleGetShareLink() {
    if (!activeTreeId) return;
    setGeneratingToken(true);
    try {
      const result = await api.post<{ token: string }>(`/trees/${activeTreeId}/share-token`);
      setShareToken(result.token);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Không thể tạo liên kết chia sẻ.");
    } finally {
      setGeneratingToken(false);
    }
  }

  async function handleRevokeShareLink() {
    if (!activeTreeId) return;
    setGeneratingToken(true);
    try {
      await api.del(`/trees/${activeTreeId}/share-token`);
      setShareToken(null);
      alert("Đã hủy bỏ tất cả liên kết chia sẻ trước đó.");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Không thể hủy bỏ liên kết chia sẻ.");
    } finally {
      setGeneratingToken(false);
    }
  }

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
      <section className="empty-tree">
        <div className="empty-tree__intro">
          <p className="eyebrow">Dành cho người mới</p>
          <h1>Bắt đầu cây gia phả của bạn</h1>
          <p>
            Sơ đồ gia phả của bạn hiện chưa có thành viên nào. Hãy thêm thành viên đầu tiên
            (ví dụ: bản thân bạn hoặc người lớn tuổi nhất trong dòng họ) để bắt đầu.
          </p>
        </div>
        <div className="onboarding-strip" aria-label="Các bước gợi ý">
          <span>1. Nhập tên</span>
          <span>2. Chọn giới tính</span>
          <span>3. Bấm lưu</span>
        </div>
        <div className="surface-card empty-tree__form">
          <PersonForm
            mode="create"
            treeId={activeTreeId}
            onSuccess={() => {
              refreshTree();
            }}
          />
        </div>
      </section>
    );
  }

  const selectedPerson = selectedId ? persons.find((p) => p.id === selectedId) : null;
  const isOwner = user?.treeId === activeTreeId;
  const isCollaborator = collaborators.some(c => c.userId === user?.userId);
  const canEdit = isOwner || isCollaborator;

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
        visibility: {
          visMarital: (selectedPerson as any).visMarital ?? "private",
          visAdoption: (selectedPerson as any).visAdoption ?? "private",
          visDeath: (selectedPerson as any).visDeath ?? "private",
          visName: (selectedPerson as any).visName ?? "public",
          visBirthYear: (selectedPerson as any).visBirthYear ?? "public",
          visPhoto: (selectedPerson as any).visPhoto ?? "private",
        },
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
      {/* Redesigned 2-Row Header: Row 1 for Brand & Search/Actions, Row 2 for Viewpoint & Grouping Toggle */}
      <div className="tree-page-header">
        <div className="tree-page-header__row-one">
          <div className="tree-page-header__brand">
            <img src="/logo.png" alt="Logo Cây Gia Phả" className="tree-page-header__logo" />
            <div className="tree-page-header__title-container">
              <h1 className="tree-page-header__title">Gia Phả Dòng Họ</h1>
              <span className="tree-page-header__count">{persons.length} thành viên</span>
            </div>
          </div>

          <div className="tree-page-header__row-one-right">
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
            <div className="tree-page-header__actions">
              {user && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCollaborationOpen(true)}
                >
                  Cộng tác
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
                >
                  + Thêm thành viên
                </button>
              )}
            </div>
          </div>
        </div>

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

      <OnboardingModal isOpen={showTutorial} onClose={handleDismissTutorial} />

      <div className="tree-workspace__layout">
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
            />
          </div>
        </div>

        {/* Right Side: Member Details and Actions Panel */}
        <div className={`tree-workspace__info-panel ${isPanelOpen ? "tree-workspace__info-panel--open" : ""}`}>
          {createMode ? (
            <div className="surface-card side-panel">
              <h3 className="side-panel__title">Tạo thành viên mới</h3>
              <PersonForm
                mode="create"
                treeId={activeTreeId}
                persons={personOptions}
                onSuccess={() => {
                  setCreateMode(false);
                  refreshTree();
                }}
                onCancel={() => setCreateMode(false)}
              />
            </div>
          ) : selectedPerson ? (
            <div className="surface-card side-panel">
              {(editMode || addRelativeMode) && (
                <h3 className="side-panel__title">
                  {selectedPerson.displayName}
                </h3>
              )}

              {editMode ? (
                <div>
                  <h4 style={{ margin: "1rem 0" }}>Sửa thông tin</h4>
                  <PersonForm
                    mode="edit"
                    treeId={activeTreeId}
                    personId={selectedPerson.id}
                    initialValues={selectedInitialValues}
                    onSuccess={() => {
                      setEditMode(false);
                      refreshTree();
                    }}
                    onCancel={() => setEditMode(false)}
                  />
                </div>
              ) : addRelativeMode ? (
                <div>
                  <h4 style={{ margin: "1rem 0" }}>Thêm quan hệ cho {selectedPerson.displayName}</h4>
                  <AddRelativeForm
                    treeId={activeTreeId}
                    persons={personOptions}
                    preselectedPersonId={selectedPerson.id}
                    onCreated={() => {
                      setAddRelativeMode(false);
                      refreshTree();
                    }}
                    onCancel={() => setAddRelativeMode(false)}
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
                          Sửa thông tin
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
                          onClick={() => setFocusId(focusId === selectedPerson.id ? null : selectedPerson.id)}
                          style={focusId === selectedPerson.id ? { border: "1px solid var(--color-brand)" } : undefined}
                        >
                          {focusId === selectedPerson.id ? "✕ Toàn bộ cây" : "👁 Xem riêng"}
                        </button>
                        
                        {/* Overflow menu */}
                        <div className="person-actions__overflow" style={{ position: "relative" }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            aria-label="Thêm tùy chọn"
                            aria-expanded={overflowOpen}
                            onClick={() => setOverflowOpen((v) => !v)}
                          >
                            ···
                          </button>
                          {overflowOpen && (
                            <div className="person-actions__overflow-menu" role="menu">
                              <DeletionDialog
                                treeId={activeTreeId}
                                personId={selectedPerson.id}
                                triggerLabel="Xóa thành viên này"
                                className="person-actions__overflow-item person-actions__overflow-item--danger"
                                onDeleted={() => {
                                  setOverflowOpen(false);
                                  setSelectedId(null);
                                  refreshTree();
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ width: "100%" }}
                      onClick={() => setSelectedId(null)}
                    >
                      Bỏ chọn
                    </button>
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
            <div className="surface-card side-panel">
              <h3 className="side-panel__title">Thêm quan hệ mới</h3>
              <AddRelativeForm
                treeId={activeTreeId}
                persons={personOptions}
                onCreated={() => {
                  setAddRelativeMode(false);
                  refreshTree();
                }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: "100%", marginTop: "0.5rem" }}
                onClick={() => setAddRelativeMode(false)}
              >
                Hủy bỏ
              </button>
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
      {isSettingsOpen && (
        <div className="settings-modal-overlay" onClick={handleCloseSettings}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal__header">
              <h2>Cài đặt</h2>
              <button
                type="button"
                className="settings-modal__close"
                onClick={handleCloseSettings}
                aria-label="Đóng cài đặt"
              >
                &times;
              </button>
            </div>
            <div className="settings-modal__body">
              {isOwner && (
                <section className="settings-section">
                  <h3>Cấu hình dòng họ</h3>
                  <RegionSelector
                    treeId={activeTreeId}
                    region={region}
                    onChange={(nextRegion) => {
                      setRegionState(nextRegion);
                      // Force TreeGraph to re-fetch addresses with the new
                      // region immediately, without a full tree reload.
                      setAddressRefreshKey((k) => k + 1);
                    }}
                  />

                  <div className="field" style={{ marginTop: "1rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={livingRedaction}
                        disabled={updatingRedaction}
                        onChange={(e) => handleRedactionChange(e.target.checked)}
                      />
                      <span>Ẩn thông tin người còn sống</span>
                    </label>
                  </div>

                  <div className="field" style={{ marginTop: "1rem" }}>
                    <label htmlFor="sharing-select">Chế độ chia sẻ</label>
                    <select
                      id="sharing-select"
                      value={sharing}
                      disabled={updatingSharing}
                      onChange={(e) => handleSharingChange(e.target.value)}
                      style={{ width: "100%", marginTop: "0.5rem" }}
                    >
                      <option value="private">Riêng tư (Private)</option>
                      <option value="link">Bằng liên kết bí mật (Link)</option>
                      <option value="public">Công khai cho thành viên (Public)</option>
                    </select>
                  </div>

                  {sharing === "link" && (
                    <div style={{ borderTop: "1px solid var(--color-hairline-soft)", paddingTop: "1rem", marginTop: "1rem" }}>
                      {shareToken ? (
                        <div>
                          <label>Liên kết chia sẻ của bạn:</label>
                          <input
                            type="text"
                            readOnly
                            value={typeof window !== "undefined" ? `${window.location.origin}/tree?treeId=${activeTreeId}&shareToken=${shareToken}` : ""}
                            style={{ width: "100%", fontSize: "0.75rem", margin: "0.5rem 0" }}
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                          />
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ flex: 1 }}
                              onClick={() => {
                                const url = `${window.location.origin}/tree?treeId=${activeTreeId}&shareToken=${shareToken}`;
                                navigator.clipboard.writeText(url);
                                alert("Đã sao chép liên kết vào bộ nhớ tạm!");
                              }}
                            >
                              Sao chép
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ flex: 1 }}
                              disabled={generatingToken}
                              onClick={handleRevokeShareLink}
                            >
                              Hủy liên kết
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ width: "100%" }}
                          disabled={generatingToken}
                          onClick={handleGetShareLink}
                        >
                          Tạo liên kết chia sẻ
                        </button>
                      )}
                    </div>
                  )}
                </section>
              )}



              <section className="settings-section" style={{ borderTop: "1px solid var(--color-hairline-soft)", paddingTop: "1.5rem", marginTop: "1.5rem" }}>
                <h3>Cài đặt hiển thị</h3>
                <TextSizeControl />
              </section>

              <section className="settings-section" style={{ borderTop: "1px solid var(--color-hairline-soft)", paddingTop: "1.5rem", marginTop: "1.5rem" }}>
                <h3>Thông tin tài khoản</h3>
                {!sessionLoading && user && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <span className="settings-modal__user" title={user.identifier}>
                      Đã đăng nhập: <strong>{user.identifier}</strong>
                    </span>
                    <SignOutButton redirectTo="/" />
                  </div>
                )}
              </section>
            </div>
            <div className="settings-modal__footer" style={{ borderTop: "1px solid var(--color-hairline-soft)", paddingTop: "1rem", marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-secondary" onClick={handleCloseSettings}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collaboration Modal (Cộng tác) */}
      {isCollaborationOpen && (
        <div className="settings-modal-overlay" onClick={handleCloseCollaboration}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal__header">
              <h2>Cộng tác xây dựng cây</h2>
              <button
                type="button"
                className="settings-modal__close"
                onClick={handleCloseCollaboration}
                aria-label="Đóng cửa sổ cộng tác"
              >
                &times;
              </button>
            </div>
            <div className="settings-modal__body">
              <section className="settings-section">
                <h3>Thành viên tham gia xây dựng cây</h3>
                <div style={{ marginBottom: "1.5rem" }}>
                  <ul style={{ paddingLeft: "1.2rem", margin: "0.5rem 0", lineHeight: "1.6" }}>
                    <li>
                      Chủ cây (Owner)
                    </li>
                    {collaborators.map((c) => (
                      <li key={c.id}>
                        {c.userId} ({c.role === "owner" ? "Chủ cây" : "Cộng tác viên"})
                      </li>
                    ))}
                  </ul>
                </div>

                {user && (
                  <form onSubmit={handleSendInvite} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem", borderTop: "1px solid var(--color-hairline-soft)", paddingTop: "1.5rem" }}>
                    <label htmlFor="invite-email" style={{ fontWeight: "bold" }}>Mời người khác qua email:</label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input
                        id="invite-email"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="email@example.com"
                        required
                        style={{ flex: 1, padding: "0.4rem 0.6rem" }}
                      />
                      <button type="submit" className="btn btn-secondary">Mời</button>
                    </div>
                  </form>
                )}

                {isOwner && pendingInvites.length > 0 && (
                  <div style={{ marginBottom: "1.5rem", border: "1px solid var(--color-hairline-soft)", padding: "0.75rem", borderRadius: "4px" }}>
                    <label style={{ fontWeight: "bold", color: "var(--color-danger)" }}>Yêu cầu mời đang chờ duyệt ({pendingInvites.length}):</label>
                    <ul style={{ listStyle: "none", padding: 0, margin: "0.5rem 0" }}>
                      {pendingInvites.map((invite) => (
                        <li key={invite.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                          <span style={{ fontSize: "0.85rem" }}>{invite.email}</span>
                          <div style={{ display: "flex", gap: "0.25rem" }}>
                            <button type="button" className="btn" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }} onClick={() => handleApproveInvite(invite.id)}>Duyệt</button>
                            <button type="button" className="btn btn-secondary" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }} onClick={() => handleRejectInvite(invite.id)}>Từ chối</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {user && (
                  <form onSubmit={handleJoinTree} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", borderTop: "1px dashed var(--color-hairline-soft)", paddingTop: "1.5rem" }}>
                    <label htmlFor="invite-code" style={{ fontWeight: "bold" }}>Nhập mã mời để tham gia cây khác:</label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input
                        id="invite-code"
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        placeholder="Mã 6 số"
                        maxLength={6}
                        required
                        style={{ flex: 1, padding: "0.4rem 0.6rem" }}
                      />
                      <button type="submit" className="btn btn-secondary">Tham gia</button>
                    </div>
                  </form>
                )}
              </section>
            </div>
            <div className="settings-modal__footer" style={{ borderTop: "1px solid var(--color-hairline-soft)", paddingTop: "1rem", marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-secondary" onClick={handleCloseCollaboration}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
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
