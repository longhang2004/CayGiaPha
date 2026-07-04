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
import { LightbulbIcon, CloseIcon } from "@/components/ui/Icons";

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
  const queryShareToken = searchParams.shareToken;

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

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCollaborationOpen, setIsCollaborationOpen] = useState(false);
  const [showBirthYears, setShowBirthYears] = useState(true);

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
      console.warn(err instanceof ApiError ? err.message : "Không thể gửi lời mời.");
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
      console.warn(err instanceof ApiError ? err.message : "Mã mời không hợp lệ.");
    }
  }

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
      console.warn(err instanceof ApiError ? err.message : "Không thể thay đổi cấu hình chia sẻ.");
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
      console.warn(err instanceof ApiError ? err.message : "Không thể cập nhật cấu hình bảo vệ.");
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
      console.warn(err instanceof ApiError ? err.message : "Không thể tạo liên kết chia sẻ.");
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
      console.warn(err instanceof ApiError ? err.message : "Không thể hủy bỏ liên kết chia sẻ.");
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
      <section className="empty-tree" style={{ maxWidth: "600px", margin: "4rem auto", textAlign: "center" }}>
        <div className="empty-tree__intro" style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Bắt đầu cây gia phả của bạn</h1>
          <p style={{ color: "var(--color-muted)", lineHeight: 1.6 }}>
            Sơ đồ gia phả của bạn hiện chưa có thành viên nào. Hãy thêm thành viên đầu tiên
            để bắt đầu.
          </p>
        </div>
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

      <div className="tree-workspace__layout">
        {/* Floating Island Header/Toolbar */}
        <div className="tree-page-header">
          <div className="tree-page-header__row-one">
            <div className="tree-page-header__brand">
              <img src="/logo.svg" alt="Logo Cây Gia Phả" className="tree-page-header__logo" />
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
                    👥 <span className="hide-on-mobile">Cộng tác</span>
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
                    ➕ <span className="hide-on-mobile">Thêm thành viên</span>
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
      <Modal isOpen={isSettingsOpen} onClose={handleCloseSettings} aria-label="Cài đặt">
        <ModalHeader title="Cài đặt" onClose={handleCloseSettings} />
        <ModalBody>
              {isOwner && (
                <section className="settings-section">
                  <h3>Cài đặt gia phả</h3>
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
                
                <div className="field" style={{ marginTop: "1rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.95rem" }}>
                    <input
                      type="checkbox"
                      checked={showBirthYears}
                      onChange={(e) => setShowBirthYears(e.target.checked)}
                    />
                    <span>Hiển thị năm sinh/năm mất trực tiếp trên các node cây</span>
                  </label>
                </div>

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
        </ModalBody>
        <ModalFooter>
          <button type="button" className="btn btn-secondary" onClick={handleCloseSettings}>
            Đóng
          </button>
        </ModalFooter>
      </Modal>

      {/* Collaboration Modal (Cộng tác) */}
      <Modal isOpen={isCollaborationOpen} onClose={handleCloseCollaboration} aria-label="Quản lý cộng tác viên">
        <ModalHeader title="Quản lý cộng tác viên" onClose={handleCloseCollaboration} />
        <ModalBody>
          <section className="settings-section">
                <h3>Thành viên hiện tại</h3>
                <div style={{ marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <Card style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "var(--color-brand)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.9rem" }}>
                      C
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>Chủ cây (Owner)</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>Quyền cao nhất</div>
                    </div>
                  </Card>
                  {collaborators.map((c) => (
                    <Card key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "var(--color-surface-hover)", color: "var(--color-fg)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.9rem" }}>
                        {c.userId.substring(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{c.userId}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--color-muted)", display: "flex", gap: "0.5rem", marginTop: "0.2rem" }}>
                          {c.role === "owner" ? <Badge variant="brand">Chủ cây</Badge> : <Badge variant="neutral">Cộng tác viên</Badge>}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {user && (
                  <form onSubmit={handleSendInvite} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem", borderTop: "1px solid var(--color-hairline-soft)", paddingTop: "1.5rem" }}>
                    <label htmlFor="invite-email" style={{ fontWeight: "bold" }}>Thêm cộng tác viên mới</label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <Input
                        id="invite-email"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="email@example.com"
                        required
                        style={{ flex: 1 }}
                      />
                      <button type="submit" className="btn btn-secondary">Mời</button>
                    </div>
                  </form>
                )}

                {isOwner && pendingInvites.length > 0 && (
                  <div style={{ marginBottom: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--color-hairline-soft)" }}>
                    <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--color-danger)" }}>Đang chờ duyệt ({pendingInvites.length} lời mời):</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {pendingInvites.map((invite) => (
                        <Card key={invite.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", borderLeftWidth: "4px", borderLeftColor: "var(--color-danger)" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{invite.email}</span>
                          <div style={{ display: "flex", gap: "0.25rem" }}>
                            <button type="button" className="btn" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }} onClick={() => handleApproveInvite(invite.id)}>Duyệt</button>
                            <button type="button" className="btn btn-secondary" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }} onClick={() => handleRejectInvite(invite.id)}>Từ chối</button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {user && (
                  <form onSubmit={handleJoinTree} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", borderTop: "1px dashed var(--color-hairline-soft)", paddingTop: "1.5rem" }}>
                    <label htmlFor="invite-code" style={{ fontWeight: "bold" }}>Tham gia gia phả bằng mã mời</label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <Input
                        id="invite-code"
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        placeholder="Nhập mã 6 chữ số"
                        maxLength={6}
                        required
                        style={{ flex: 1 }}
                      />
                      <button type="submit" className="btn btn-secondary">Tham gia</button>
                    </div>
                  </form>
                )}
              </section>
        </ModalBody>
        <ModalFooter>
          <button type="button" className="btn btn-secondary" onClick={handleCloseCollaboration}>
            Đóng
          </button>
        </ModalFooter>
      </Modal>
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
