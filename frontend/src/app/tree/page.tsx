"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/app/providers";
import { TreeGraph } from "@/components/graph/TreeGraph";
import { PersonForm } from "@/components/person/PersonForm";
import { AddRelativeForm } from "@/components/person/AddRelativeForm";
import { DeletionDialog } from "@/components/deletion/DeletionDialog";
import { SearchPanel } from "@/components/search/SearchPanel";
import { RegionSelector } from "@/components/region/RegionSelector";
import { PersonPhotos } from "@/components/photos/PersonPhotos";
import { api, ApiError } from "@/lib/apiClient";
import type { Person, Relationship } from "@/lib/graph";
import type { Region } from "@/lib/region";
import "@/components/graph/graph.css";

interface TreePageProps {
  searchParams: {
    treeId?: string;
    shareToken?: string;
  };
}

export default function TreePage({ searchParams }: TreePageProps) {
  const { user, loading: sessionLoading } = useSession();
  
  const queryTreeId = searchParams.treeId;
  const queryShareToken = searchParams.shareToken;
  const activeTreeId = queryTreeId || user?.treeId;

  const [persons, setPersons] = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [region, setRegionState] = useState<Region>("Bac");
  const [livingRedaction, setLivingRedaction] = useState(true);
  const [sharing, setSharing] = useState("private");
  
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [addRelativeMode, setAddRelativeMode] = useState(false);
  const [createMode, setCreateMode] = useState(false);

  const [updatingSharing, setUpdatingSharing] = useState(false);
  const [updatingRedaction, setUpdatingRedaction] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(queryShareToken || null);
  const [generatingToken, setGeneratingToken] = useState(false);

  const loadTree = useCallback(async (id: string, token?: string) => {
    setLoadingData(true);
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

  if (sessionLoading || (loadingData && persons.length === 0)) {
    return (
      <section className="center-state" aria-live="polite">
        <div className="center-state__card">
          <span className="center-state__spinner" aria-hidden="true" />
          <p>Đang tải sơ đồ gia phả…</p>
        </div>
      </section>
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

  // Map person option for relation dropdown selection
  const personOptions = persons.map((p) => ({ id: p.id, displayName: p.displayName }));

  // Map selected person's initial values for the edit form
  const selectedInitialValues = selectedPerson
    ? {
        displayName: selectedPerson.displayName,
        gender: selectedPerson.gender,
        birthOrder: selectedPerson.birthOrder ?? undefined,
        birthYear: selectedPerson.birthYear ?? undefined,
        deathStatus: selectedPerson.deceased ?? false,
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

  return (
    <section className="tree-workspace">
      <div className="tree-workspace__header">
        <div>
          <p className="eyebrow">{persons.length} thành viên</p>
          <h1>Sơ đồ gia phả</h1>
          <p className="tree-workspace__hint">Chọn một người trên sơ đồ để xem chi tiết, sửa thông tin hoặc thêm người thân.</p>
        </div>
        {isOwner && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setSelectedId(null);
              setAddRelativeMode(true);
              setEditMode(false);
              setCreateMode(false);
            }}
          >
            Thêm quan hệ mới
          </button>
        )}
      </div>

      <div className="onboarding-strip onboarding-strip--workspace" aria-label="Gợi ý sử dụng sơ đồ">
        <span>Chọn người để xem chi tiết</span>
        <span>Đổi góc nhìn để tính xưng hô</span>
        {isOwner ? <span>Thêm quan hệ từ bảng bên phải</span> : <span>Bạn đang xem theo quyền chia sẻ</span>}
      </div>

      <div className="tree-workspace__layout">
        {/* Main interactive SVG graph area */}
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
          />
        </div>

        {/* Action and configuration sidebar */}
        <div className="tree-workspace__sidebar">
          
          {/* Section 1: Selected Node Operations */}
          <div className="surface-card side-panel">
            <h3 className="side-panel__title">
              {selectedPerson ? selectedPerson.displayName : "Thành viên sơ đồ"}
            </h3>

            {selectedPerson ? (
              <div>
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
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ width: "100%", marginTop: "0.5rem" }}
                      onClick={() => setEditMode(false)}
                    >
                      Hủy bỏ
                    </button>
                  </div>
                ) : addRelativeMode ? (
                  <div>
                    <h4 style={{ margin: "1rem 0" }}>Thêm quan hệ cho {selectedPerson.displayName}</h4>
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
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
                    {isOwner && (
                      <>
                        <button
                          type="button"
                          className="btn"
                          style={{ width: "100%" }}
                          onClick={() => setEditMode(true)}
                        >
                          Sửa thông tin
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ width: "100%" }}
                          onClick={() => setAddRelativeMode(true)}
                        >
                          Thêm quan hệ
                        </button>
                        <DeletionDialog
                          treeId={activeTreeId}
                          personId={selectedPerson.id}
                          triggerLabel="Xóa thành viên này"
                          onDeleted={() => {
                            setSelectedId(null);
                            refreshTree();
                          }}
                        />
                      </>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ width: "100%" }}
                      onClick={() => setSelectedId(null)}
                    >
                      Bỏ chọn
                    </button>

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
              <div>
                <h4 style={{ margin: "1rem 0" }}>Thêm quan hệ mới</h4>
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
            ) : createMode ? (
              <div>
                <h4 style={{ margin: "1rem 0" }}>Tạo thành viên mới</h4>
                <PersonForm
                  mode="create"
                  treeId={activeTreeId}
                  onSuccess={() => {
                    setCreateMode(false);
                    refreshTree();
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: "100%", marginTop: "0.5rem" }}
                  onClick={() => setCreateMode(false)}
                >
                  Hủy bỏ
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {isOwner && (
                  <button
                    type="button"
                    className="btn"
                    style={{ width: "100%" }}
                    onClick={() => {
                      setSelectedId(null);
                      setCreateMode(true);
                      setAddRelativeMode(false);
                      setEditMode(false);
                    }}
                  >
                    Tạo thành viên mới
                  </button>
                )}
                <p style={{ fontSize: "0.875rem", margin: 0, textAlign: "center" }}>
                  Hoặc chọn một người trên sơ đồ để sửa thông tin / thêm người thân.
                </p>
              </div>
            )}
          </div>

          {/* Section 2: Search & Filter */}
          <div className="surface-card side-panel">
            <h3 className="side-panel__title">
              Tìm kiếm & Lọc
            </h3>
            <SearchPanel
              treeId={activeTreeId}
              viewpointId={selectedId || undefined}
              onSelectResult={(id) => {
                setSelectedId(id);
                setEditMode(false);
                setAddRelativeMode(false);
              }}
            />
          </div>

          {/* Section 3: Tree Configurations (Owner only) */}
          {isOwner && (
            <div className="surface-card side-panel side-panel--stacked">
              <h3 className="side-panel__title side-panel__title--flush">
                Cấu hình dòng họ
              </h3>

              <RegionSelector
                treeId={activeTreeId}
                region={region}
                onChange={(nextRegion) => setRegionState(nextRegion)}
              />

              <div className="field">
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

              <div className="field">
                <label htmlFor="sharing-select">Chế độ chia sẻ</label>
                <br />
                <select
                  id="sharing-select"
                  value={sharing}
                  disabled={updatingSharing}
                  onChange={(e) => handleSharingChange(e.target.value)}
                  style={{ width: "100%" }}
                >
                  <option value="private">Riêng tư (Private)</option>
                  <option value="link">Bằng liên kết bí mật (Link)</option>
                  <option value="public">Công khai cho thành viên (Public)</option>
                </select>
              </div>

              {sharing === "link" && (
                <div style={{ borderTop: "1px solid var(--color-hairline-soft)", paddingTop: "1rem" }}>
                  {shareToken ? (
                    <div>
                      <label>Liên kết chia sẻ của bạn:</label>
                      <input
                        type="text"
                        readOnly
                        value={typeof window !== "undefined" ? `${window.location.origin}/tree?treeId=${activeTreeId}&shareToken=${shareToken}` : ""}
                        style={{ width: "100%", fontSize: "0.75rem", marginBottom: "0.5rem" }}
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
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
