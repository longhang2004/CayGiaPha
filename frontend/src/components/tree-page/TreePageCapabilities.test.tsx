import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Capabilities, Person, TreeAccessRole } from "@/lib/graph";
import type { TreeContextType } from "./TreeContext";
import { TreeContext } from "./TreeContext";
import { TreePageHeader } from "./TreePageHeader";
import { TreePageSlidePanel } from "./TreePageSlidePanel";

vi.mock("@/app/providers", () => ({
  useSession: () => ({ user: { userId: "user-1" }, loading: false }),
}));
vi.mock("@/components/search/SearchPanel", () => ({ SearchPanel: () => <div>Tìm kiếm</div> }));
vi.mock("./TreePersonPicker", () => ({
  TreePersonPicker: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div role="dialog" aria-label="Chọn người làm góc nhìn" /> : null,
}));
vi.mock("@/components/graph/PersonInfoPanel", () => ({
  PersonInfoPanel: ({ person }: { person: Person }) => <div>{person.displayName}</div>,
}));
vi.mock("@/components/person/PersonForm", () => ({ PersonForm: () => <div>Biểu mẫu thành viên</div> }));
vi.mock("@/components/person/AddRelativeForm", () => ({ AddRelativeForm: () => <div>Biểu mẫu quan hệ</div> }));
vi.mock("@/components/deletion/DeletionDialog", () => ({
  DeletionDialog: ({ triggerLabel }: { triggerLabel: string }) => <button type="button">{triggerLabel}</button>,
}));
vi.mock("@/components/photos/PersonPhotos", () => ({
  PersonPhotos: ({ canEdit }: { canEdit: boolean }) => <div data-testid="photos" data-can-edit={String(canEdit)}>Ảnh</div>,
}));
vi.mock("@/components/claim/ClaimFlow", () => ({ ClaimFlow: () => <div>Mời xác nhận</div> }));
vi.mock("@/components/graph/UpcomingEventsWidget", () => ({ UpcomingEventsWidget: () => null }));

const NONE: Capabilities = {
  editContent: false,
  editRelationships: false,
  editPhotos: false,
  editVisibility: false,
  manageClaim: false,
  manageTree: false,
  manageCollaboration: false,
};

function capabilitiesFor(role: TreeAccessRole, ownNode = false): Capabilities {
  if (role === "OWNER") {
    return {
      editContent: true,
      editRelationships: true,
      editPhotos: true,
      editVisibility: true,
      manageClaim: true,
      manageTree: true,
      manageCollaboration: true,
    };
  }
  if (role === "CONTRIBUTOR") {
    return { ...NONE, editContent: true, editRelationships: true, editPhotos: true };
  }
  if (role === "LINKED" && ownNode) {
    return { ...NONE, editContent: true, editPhotos: true, editVisibility: true };
  }
  return { ...NONE };
}

function contextFor(role: TreeAccessRole): TreeContextType {
  const treeCapabilities = capabilitiesFor(role);
  const selectedCapabilities = role === "LINKED" ? capabilitiesFor(role, true) : treeCapabilities;
  const person: Person = {
    id: "person-1",
    displayName: "Nguyễn Văn Minh",
    claimed: false,
    capabilities: selectedCapabilities,
  };
  const noop = vi.fn();

  return {
    activeTreeId: "tree-1",
    shareToken: null,
    persons: [person],
    relationships: [],
    addresses: new Map(),
    collaborators: [],
    treeName: "Gia đình Nguyễn",
    region: "Bac",
    livingRedaction: true,
    sharing: "private",
    showBirthYears: true,
    loadingData: false,
    addressesReady: true,
    addressLoading: false,
    error: null,
    addressError: null,
    egoId: person.id,
    selectedId: person.id,
    selectedAddress: undefined,
    selectedEgo: person,
    focusId: null,
    addressRefreshKey: 0,
    editMode: false,
    addRelativeMode: false,
    createMode: false,
    isSettingsOpen: false,
    isCollaborationOpen: false,
    accessRole: role,
    capabilities: treeCapabilities,
    isOwner: role === "OWNER",
    isCollaborator: role === "CONTRIBUTOR",
    canEdit: treeCapabilities.editContent,
    guidanceRole: role === "OWNER" ? "owner" : role === "CONTRIBUTOR" ? "editor" : "reader",
    setEgoId: noop,
    setSelectedId: noop,
    setFocusId: noop,
    setEditMode: noop,
    setAddRelativeMode: noop,
    setCreateMode: noop,
    setIsSettingsOpen: noop,
    setIsCollaborationOpen: noop,
    refreshTree: noop,
    claimInviteAction: vi.fn(),
    upcomingEventsLoader: vi.fn(),
    setTreeName: noop,
    setRegionState: noop,
    setLivingRedaction: noop,
    setSharing: noop,
    setShareToken: noop,
    setShowBirthYears: noop,
    setAddressRefreshKey: noop,
  };
}

function renderRole(role: TreeAccessRole) {
  render(
    <TreeContext.Provider value={contextFor(role)}>
      <TreePageHeader />
      <TreePageSlidePanel />
    </TreeContext.Provider>,
  );
}

describe("tree workspace capability-driven actions", () => {
  it("targets add-relative at the selected person before the viewpoint person", async () => {
    const context = contextFor("OWNER");
    const ego = context.persons[0];
    const selected: Person = {
      id: "person-2",
      displayName: "Nguyễn Thị Mai",
      capabilities: capabilitiesFor("OWNER"),
    };
    context.persons = [ego, selected];
    context.selectedId = selected.id;

    render(
      <TreeContext.Provider value={context}>
        <TreePageHeader />
      </TreeContext.Provider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Thêm người thân" }));
    expect(context.setSelectedId).toHaveBeenCalledWith(selected.id);
    expect(context.setCreateMode).toHaveBeenCalledWith(false);
    expect(context.setEditMode).toHaveBeenCalledWith(false);
    expect(context.setAddRelativeMode).toHaveBeenCalledWith(true);
  });

  it("shows compact context, content, and administration actions to the owner", async () => {
    renderRole("OWNER");
    const header = screen.getByRole("banner");
    expect(screen.getByRole("link", { name: "Các cây" })).toBeInTheDocument();
    expect(within(header).getByText("Đang xem từ")).toBeInTheDocument();
    expect(within(header).getByText("Nguyễn Văn Minh")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đổi người" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thêm người thân" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chỉnh sửa thông tin" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thêm quan hệ" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Thao tác khác" }));
    expect(screen.getByRole("button", { name: "Cộng tác" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cài đặt cây" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thêm thành viên khác" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sửa người đang chọn" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tìm người" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đổi góc nhìn" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mở hướng dẫn nhanh" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Trung tâm hướng dẫn" })).toBeInTheDocument();
  });

  it("lets contributors edit content and relationships without owner administration", async () => {
    renderRole("CONTRIBUTOR");
    expect(screen.getByRole("button", { name: "Thêm người thân" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chỉnh sửa thông tin" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thêm quan hệ" })).toBeInTheDocument();
    expect(screen.queryByText("Mời xác nhận")).not.toBeInTheDocument();
    expect(screen.getByTestId("photos")).toHaveAttribute("data-can-edit", "true");
    await userEvent.click(screen.getByRole("button", { name: "Thao tác khác" }));
    expect(screen.queryByRole("button", { name: "Cộng tác" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cài đặt cây" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thêm thành viên khác" })).toBeInTheDocument();
  });

  it("lets linked users edit their own node and photos but not the tree structure", async () => {
    renderRole("LINKED");
    expect(screen.queryByRole("button", { name: "Thêm người thân" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chỉnh sửa thông tin" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thêm quan hệ" })).not.toBeInTheDocument();
    expect(screen.queryByText("Mời xác nhận")).not.toBeInTheDocument();
    expect(screen.getByTestId("photos")).toHaveAttribute("data-can-edit", "true");
    await userEvent.click(screen.getByRole("button", { name: "Thao tác khác" }));
    expect(screen.queryByRole("button", { name: "Cộng tác" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thêm thành viên khác" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sửa người đang chọn" })).toBeInTheDocument();
  });

  it("keeps reader actions read-only while preserving find, viewpoint, and help", async () => {
    renderRole("READER");
    expect(screen.queryByRole("button", { name: "Thêm người thân" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Chỉnh sửa thông tin" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thêm quan hệ" })).not.toBeInTheDocument();
    expect(screen.queryByText("Mời xác nhận")).not.toBeInTheDocument();
    expect(screen.getByTestId("photos")).toHaveAttribute("data-can-edit", "false");
    await userEvent.click(screen.getByRole("button", { name: "Thao tác khác" }));
    expect(screen.queryByRole("button", { name: "Cộng tác" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thêm thành viên khác" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sửa người đang chọn" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tìm người" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đổi góc nhìn" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mở hướng dẫn nhanh" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Trung tâm hướng dẫn" })).toBeInTheDocument();
  });
});
