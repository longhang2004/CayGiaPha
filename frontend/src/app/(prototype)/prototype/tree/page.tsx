"use client";

/**
 * Prototype: Tree workspace (populated state)
 *
 * Mirrors: src/app/tree/page.tsx (populated tree — persons.length > 0 path)
 *
 * Key differences from the real page:
 *  - Wrapped in MockSessionProvider (no real login required).
 *  - `persons` and `relationships` are pre-seeded with MOCK_* constants.
 *  - API mutating calls (save, delete, share) are stubbed to no-ops.
 *  - `fetchAddresses` on TreeGraph is stubbed to return empty addresses
 *    instantly, avoiding backend calls.
 *  - Accepts `?panel=settings` to open the settings modal by default.
 *
 * ⚠️  Dev/local only — gated by the (prototype) layout.
 *
 * SYNC RULE: When src/app/tree/page.tsx UI/UX changes (layout, components,
 * interactions, CSS classes, accessible labels, data-testid attributes),
 * update this file in the SAME commit/PR.
 */

import { useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TreeGraph } from "@/components/graph/TreeGraph";
import { PersonForm } from "@/components/person/PersonForm";
import { AddRelativeForm } from "@/components/person/AddRelativeForm";
import { DeletionDialog } from "@/components/deletion/DeletionDialog";
import { SearchPanel } from "@/components/search/SearchPanel";
import { RegionSelector } from "@/components/region/RegionSelector";
import { PersonPhotos } from "@/components/photos/PersonPhotos";
import { TextSizeControl } from "@/components/a11y/TextSizeControl";
import { PersonInfoPanel } from "@/components/graph/PersonInfoPanel";
import { ViewpointSelector } from "@/components/graph/ViewpointSelector";
import type { Person, Relationship, Address, ViewpointAddresses } from "@/lib/graph";
import type { Region } from "@/lib/region";
import { MockSessionProvider } from "@/lib/prototype/mockSession";
import {
  MOCK_PERSONS,
  MOCK_RELATIONSHIPS,
  PROTOTYPE_TREE_ID,
  MOCK_USER,
} from "@/lib/prototype/mockData";
import "@/components/graph/graph.css";

/** Stub fetchAddresses that resolves immediately with no addresses. */
async function mockFetchAddresses(
  _treeId: string,
  egoId: string,
): Promise<ViewpointAddresses> {
  return { egoId, addresses: [] };
}

/** Stub PersonForm that shows a success message after "submit". */
function PrototypePersonForm(
  props: React.ComponentProps<typeof PersonForm>,
) {
  return (
    <div>
      <div
        style={{
          padding: "0.75rem",
          background: "var(--color-surface-alt, #f3f4f6)",
          borderRadius: "var(--radius-sm, 0.25rem)",
          fontSize: "0.875rem",
          color: "var(--color-muted)",
          marginBottom: "1rem",
        }}
      >
        📋 Prototype: biểu mẫu PersonForm — gọi API thật sẽ bị chặn.
      </div>
      <PersonForm {...props} />
    </div>
  );
}

function PrototypeTreeContent() {
  const nextSearchParams = useSearchParams();

  const [persons] = useState<Person[]>(MOCK_PERSONS);
  const [relationships] = useState<Relationship[]>(MOCK_RELATIONSHIPS);
  const [region, setRegionState] = useState<Region>("Bac");
  const [livingRedaction] = useState(false);
  const [sharing] = useState("private");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<
    Address | undefined
  >(undefined);
  const [addresses, setAddresses] = useState<Map<string, Address>>(new Map());
  const [selectedEgo, setSelectedEgo] = useState<Person | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [addRelativeMode, setAddRelativeMode] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [egoId, setEgoId] = useState<string>(MOCK_PERSONS[0].id);
  const [addressLoading] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(
    () => nextSearchParams.get("panel") === "settings",
  );

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const refreshTree = useCallback(() => {
    /* no-op in prototype */
  }, []);

  const handleAddressesLoaded = useCallback((loaded: Map<string, Address>) => {
    setAddresses(loaded);
  }, []);

  const selectedPerson = selectedId
    ? persons.find((p) => p.id === selectedId)
    : null;
  const isOwner = true; // always owner in prototype

  const personOptions = persons.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    gender: p.gender,
  }));

  const selectedInitialValues = selectedPerson
    ? {
        displayName: selectedPerson.displayName,
        gender: selectedPerson.gender,
        birthOrder: selectedPerson.birthOrder ?? undefined,
        birthYear: selectedPerson.birthYear ?? undefined,
        deathStatus: selectedPerson.deceased ?? false,
        visibility: {
          visMarital: "private" as const,
          visAdoption: "private" as const,
          visDeath: "private" as const,
          visName: "public" as const,
          visBirthYear: "public" as const,
          visPhoto: "private" as const,
        },
      }
    : undefined;

  return (
    /* ===== BEGIN: mirror of src/app/tree/page.tsx (populated branch) ===== */
    <section className="tree-workspace">
      <div className="tree-workspace__header">
        <div>
          <p className="eyebrow">{persons.length} thành viên</p>
          <h1>Sơ đồ gia phả</h1>
          <p className="tree-workspace__hint">
            Chọn một người trên sơ đồ để xem chi tiết, sửa thông tin hoặc thêm
            người thân.
          </p>
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

      <div className="tree-workspace__layout">
        {/* Left/Center: Main Toolbar & Graph */}
        <div className="tree-workspace__main">
          {/* Search & Filter Toolbar */}
          <div className="surface-card tree-workspace__toolbar-container">
            <SearchPanel
              treeId={PROTOTYPE_TREE_ID}
              persons={persons}
              addresses={addresses}
              egoId={egoId}
              viewpointId={selectedId || undefined}
              onSelectResult={(id) => {
                setSelectedId(id);
                setEditMode(false);
                setAddRelativeMode(false);
              }}
              onAddMember={
                isOwner
                  ? () => {
                      setSelectedId(null);
                      setCreateMode(true);
                      setAddRelativeMode(false);
                      setEditMode(false);
                    }
                  : undefined
              }
              viewpointSelector={
                <ViewpointSelector
                  persons={persons}
                  egoId={egoId}
                  onChange={setEgoId}
                  disabled={addressLoading}
                />
              }
            />
          </div>

          {/* Interactive SVG graph area */}
          <div className="tree-workspace__graph">
            <TreeGraph
              treeId={PROTOTYPE_TREE_ID}
              persons={persons}
              relationships={relationships}
              selectedId={selectedId}
              fetchAddresses={mockFetchAddresses}
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
              onAddressLoading={() => {}}
              onAddressesLoaded={handleAddressesLoaded}
              hideViewpointSelector={true}
            />
          </div>
        </div>

        {/* Right Side: Member Details and Actions Panel */}
        <div className="tree-workspace__info-panel">
          {createMode ? (
            <div className="surface-card side-panel">
              <h3 className="side-panel__title">Tạo thành viên mới</h3>
              <PrototypePersonForm
                mode="create"
                treeId={PROTOTYPE_TREE_ID}
                onSuccess={() => {
                  setCreateMode(false);
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
          ) : selectedPerson ? (
            <div className="surface-card side-panel">
              <h3 className="side-panel__title">{selectedPerson.displayName}</h3>

              {editMode ? (
                <div>
                  <h4 style={{ margin: "1rem 0" }}>Sửa thông tin</h4>
                  <PrototypePersonForm
                    mode="edit"
                    treeId={PROTOTYPE_TREE_ID}
                    personId={selectedPerson.id}
                    initialValues={selectedInitialValues}
                    onSuccess={() => {
                      setEditMode(false);
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
                  <h4 style={{ margin: "1rem 0" }}>
                    Thêm quan hệ cho {selectedPerson.displayName}
                  </h4>
                  <AddRelativeForm
                    treeId={PROTOTYPE_TREE_ID}
                    persons={personOptions}
                    preselectedPersonId={selectedPerson.id}
                    onCreated={() => {
                      setAddRelativeMode(false);
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
                <div>
                  <PersonInfoPanel
                    person={selectedPerson}
                    ego={selectedEgo}
                    address={selectedAddress}
                    loading={addressLoading}
                    hideHeading={true}
                  />

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                      marginTop: "1rem",
                    }}
                  >
                    {isOwner && (
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

                        {/* Overflow menu */}
                        <div
                          className="person-actions__overflow"
                          style={{ position: "relative" }}
                        >
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
                            <div
                              className="person-actions__overflow-menu"
                              role="menu"
                            >
                              <DeletionDialog
                                treeId={PROTOTYPE_TREE_ID}
                                personId={selectedPerson.id}
                                triggerLabel="Xóa thành viên này"
                                className="person-actions__overflow-item person-actions__overflow-item--danger"
                                onDeleted={() => {
                                  setOverflowOpen(false);
                                  setSelectedId(null);
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

                  <div
                    style={{
                      marginTop: "1.5rem",
                      borderTop: "1px solid var(--color-hairline-soft)",
                      paddingTop: "1rem",
                    }}
                  >
                    <PersonPhotos
                      treeId={PROTOTYPE_TREE_ID}
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
                treeId={PROTOTYPE_TREE_ID}
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
            <div className="surface-card side-panel">
              <p
                style={{
                  color: "var(--color-muted)",
                  margin: 0,
                  textAlign: "center",
                }}
              >
                Chọn một người để xem thông tin và cách xưng hô.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal (Cài đặt) */}
      {isSettingsOpen && (
        <div className="settings-modal-overlay" onClick={handleCloseSettings}>
          <div
            className="settings-modal"
            onClick={(e) => e.stopPropagation()}
          >
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
                    treeId={PROTOTYPE_TREE_ID}
                    region={region}
                    onChange={(nextRegion) => setRegionState(nextRegion)}
                  />

                  <div className="field" style={{ marginTop: "1rem" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={livingRedaction}
                        readOnly
                      />
                      <span>Ẩn thông tin người còn sống</span>
                    </label>
                  </div>

                  <div className="field" style={{ marginTop: "1rem" }}>
                    <label htmlFor="proto-sharing-select">
                      Chế độ chia sẻ
                    </label>
                    <select
                      id="proto-sharing-select"
                      value={sharing}
                      onChange={() => { /* read-only in prototype */ }}
                      style={{ width: "100%", marginTop: "0.5rem" }}
                    >
                      <option value="private">Riêng tư (Private)</option>
                      <option value="link">
                        Bằng liên kết bí mật (Link)
                      </option>
                      <option value="public">
                        Công khai cho thành viên (Public)
                      </option>
                    </select>
                  </div>
                </section>
              )}

              <section
                className="settings-section"
                style={{
                  borderTop: "1px solid var(--color-hairline-soft)",
                  paddingTop: "1.5rem",
                  marginTop: "1.5rem",
                }}
              >
                <h3>Cài đặt hiển thị</h3>
                <TextSizeControl />
              </section>

              <section
                className="settings-section"
                style={{
                  borderTop: "1px solid var(--color-hairline-soft)",
                  paddingTop: "1.5rem",
                  marginTop: "1.5rem",
                }}
              >
                <h3>Thông tin tài khoản</h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <span
                    className="settings-modal__user"
                    title={MOCK_USER.identifier}
                  >
                    Đã đăng nhập:{" "}
                    <strong>{MOCK_USER.identifier}</strong>
                  </span>
                  {/* SignOutButton omitted in prototype to avoid redirect */}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => alert("[Prototype] Đăng xuất — no-op")}
                  >
                    Đăng xuất
                  </button>
                </div>
              </section>
            </div>
            <div
              className="settings-modal__footer"
              style={{
                borderTop: "1px solid var(--color-hairline-soft)",
                paddingTop: "1rem",
                marginTop: "1rem",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseSettings}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
    /* ===== END: mirror of src/app/tree/page.tsx (populated branch) ===== */
  );
}

export default function PrototypeTreePage() {
  return (
    <MockSessionProvider>
      <Suspense>
        <PrototypeTreeContent />
      </Suspense>
    </MockSessionProvider>
  );
}
