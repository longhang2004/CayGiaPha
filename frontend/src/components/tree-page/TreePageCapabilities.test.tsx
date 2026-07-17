import { readFileSync } from "node:fs";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Capabilities, Person, TreeAccessRole } from "@/lib/graph";
import { readGuidanceState, recordWorkspaceCoachStatus } from "@/lib/guidance/storage";
import type { TreeContextType } from "./TreeContext";
import { TreeContext } from "./TreeContext";
import { TreePageHeader } from "./TreePageHeader";
import { TreePageSlidePanel } from "./TreePageSlidePanel";

const treeWorkspaceStyles = readFileSync(
  "src/styles/_03_tree_workspace.scss",
  "utf8",
);

vi.mock("@/app/providers", () => ({
  useSession: () => ({ user: { userId: "user-1" }, loading: false }),
}));
vi.mock("@/components/search/SearchPanel", () => ({ SearchPanel: () => <div>Tìm kiếm</div> }));
vi.mock("./TreePersonPicker", () => ({
  TreePersonPicker: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div role="dialog" aria-label="Chọn người để xét vai vế" /> : null,
}));
vi.mock("@/components/graph/PersonInfoPanel", () => ({
  PersonInfoPanel: ({
    person,
    addressGuidanceAnchor,
  }: {
    person: Person;
    addressGuidanceAnchor?: string;
  }) => (
    <div
      className="person-info__address-callout"
      data-guidance-anchor={addressGuidanceAnchor}
    >
      {person.displayName}
    </div>
  ),
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

beforeEach(() => {
  window.localStorage.clear();
  document.querySelectorAll<HTMLElement>("[data-guidance-highlight]").forEach((element) => {
    element.removeAttribute("data-guidance-highlight");
  });
});

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
    expect(within(header).getByText("Xét vai vế theo")).toBeInTheDocument();
    expect(within(header).getByText("Nguyễn Văn Minh")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đổi người xét" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thêm người thân" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chỉnh sửa thông tin" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thêm quan hệ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đang dùng để xét vai vế" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Thao tác khác" }));
    const actionDrawer = screen.getByRole("dialog", { name: "Thao tác khác" });
    expect(screen.getByRole("button", { name: "Cộng tác" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cài đặt cây" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thêm thành viên khác" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sửa người đang chọn" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tìm người" })).toBeInTheDocument();
    expect(within(actionDrawer).getByRole("button", { name: "Đổi người xét" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mở hướng dẫn nhanh" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Trung tâm hướng dẫn" })).toBeInTheDocument();
  });

  it("keeps action drawer chrome and Coach fixed around one list scroll region", async () => {
    renderRole("OWNER");

    await userEvent.click(screen.getByRole("button", { name: "Thao tác khác" }));
    const drawer = screen.getByRole("dialog", { name: "Thao tác khác" });
    const chrome = drawer.querySelector(".tree-workspace-action-drawer__chrome");
    const scrollRegions = drawer.querySelectorAll('[data-panel-scroll-region="actions"]');

    expect(chrome).not.toBeNull();
    expect(within(chrome as HTMLElement).getByText("Thao tác với cây")).toBeInTheDocument();
    expect(within(chrome as HTMLElement).getByRole("heading", { name: "Thao tác khác" })).toBeInTheDocument();
    expect(chrome?.querySelector(".tree-workspace-action-drawer__description")).toBeNull();
    expect(scrollRegions).toHaveLength(1);

    const body = scrollRegions[0] as HTMLElement;
    expect(body).toHaveClass("tree-workspace-action-drawer__body");
    expect(body.querySelector(".tree-workspace-action-drawer__description")).not.toBeNull();
    expect(body.querySelector(".tree-workspace-action-drawer__list")).not.toBeNull();
    expect(body.contains(chrome)).toBe(false);

    const coach = await within(drawer).findByRole("dialog", { name: "Hướng dẫn nhanh" });
    const coachLayer = coach.closest(".workspace-coach-layer--actions");
    expect(coachLayer).not.toBeNull();
    expect(coachLayer?.parentElement).toHaveClass("tree-workspace-action-drawer__content");
    expect(body.contains(coachLayer)).toBe(false);
  });

  it("keeps the action bottom sheet vertical animation more specific than the generic right drawer", () => {
    expect(treeWorkspaceStyles).toMatch(
      /\.tree-workspace-action-drawer\s*\{[^}]*display:\s*grid;[^}]*grid-template-rows:\s*auto minmax\(0,\s*1fr\);[^}]*overflow:\s*hidden;/s,
    );
    expect(treeWorkspaceStyles).toMatch(
      /\.tree-workspace-action-drawer__body\s*\{[^}]*overflow-y:\s*auto;/s,
    );
    expect(treeWorkspaceStyles).toContain(
      ".cgp-drawer-modal--right:not([data-exiting]):has(> .tree-workspace-action-drawer) > .tree-workspace-action-drawer",
    );
    expect(treeWorkspaceStyles).toContain(
      ".cgp-drawer-modal--right[data-exiting]:has(> .tree-workspace-action-drawer) > .tree-workspace-action-drawer",
    );
    expect(treeWorkspaceStyles).toMatch(
      /@keyframes tree-workspace-action-sheet-enter\s*\{\s*from\s*\{\s*transform:\s*translateY\(100%\);\s*}\s*to\s*\{\s*transform:\s*translateY\(0\);/s,
    );
    expect(treeWorkspaceStyles).toMatch(
      /@keyframes tree-workspace-action-sheet-exit\s*\{\s*from\s*\{\s*transform:\s*translateY\(0\);\s*}\s*to\s*\{\s*transform:\s*translateY\(100%\);/s,
    );
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
    const actionDrawer = screen.getByRole("dialog", { name: "Thao tác khác" });
    expect(screen.queryByRole("button", { name: "Cộng tác" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thêm thành viên khác" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sửa người đang chọn" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tìm người" })).toBeInTheDocument();
    expect(within(actionDrawer).getByRole("button", { name: "Đổi người xét" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mở hướng dẫn nhanh" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Trung tâm hướng dẫn" })).toBeInTheDocument();
  });

  it.each([
    ["OWNER", 3, true],
    ["CONTRIBUTOR", 3, true],
    ["LINKED", 3, true],
    ["READER", 2, false],
  ] as const)(
    "starts the capability-aware actions Coach once for %s",
    async (role, expectedCount, hasEditStep) => {
      const context = contextFor(role);
      render(
        <TreeContext.Provider value={context}>
          <TreePageHeader />
        </TreeContext.Provider>,
      );

      expect(screen.queryByRole("dialog", { name: "Hướng dẫn nhanh" })).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Thao tác khác" }));

      const drawer = screen.getByRole("dialog", { name: "Thao tác khác" });
      let coach = await within(drawer).findByRole("dialog", { name: "Hướng dẫn nhanh" });
      expect(coach).toHaveTextContent(`Bước 1 / ${expectedCount}`);
      expect(coach).toHaveTextContent("Tìm người và di chuyển trên sơ đồ");

      await userEvent.click(within(coach).getByRole("button", { name: "Tiếp theo" }));
      coach = within(drawer).getByRole("dialog", { name: "Hướng dẫn nhanh" });
      if (hasEditStep) {
        expect(coach).toHaveTextContent(`Bước 2 / ${expectedCount}`);
        expect(coach).toHaveTextContent("Sửa thông tin và thêm thành viên");
        await userEvent.click(within(coach).getByRole("button", { name: "Tiếp theo" }));
        coach = within(drawer).getByRole("dialog", { name: "Hướng dẫn nhanh" });
      }

      expect(coach).toHaveTextContent(`Bước ${expectedCount} / ${expectedCount}`);
      expect(coach).toHaveTextContent("Làm quen với các thao tác trong cây");
      expect(context.setSelectedId).not.toHaveBeenCalled();
      expect(context.setEgoId).not.toHaveBeenCalled();
      expect(context.setEditMode).not.toHaveBeenCalled();
      expect(context.setAddRelativeMode).not.toHaveBeenCalled();
      expect(context.setCreateMode).not.toHaveBeenCalled();

      await userEvent.click(within(coach).getByRole("button", { name: "Hoàn tất" }));
      const stored = readGuidanceState(window.localStorage);
      expect(stored.workspaceCoach.chapters.actions).toBe("completed");
      expect(stored.workspaceCoach.chapters.overview).toBeUndefined();
    },
  );

  it("replays only the actions chapter without closing its drawer", async () => {
    recordWorkspaceCoachStatus("actions", "completed", window.localStorage);
    const context = contextFor("OWNER");
    render(
      <TreeContext.Provider value={context}>
        <TreePageHeader />
      </TreeContext.Provider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Thao tác khác" }));
    const drawer = screen.getByRole("dialog", { name: "Thao tác khác" });
    expect(within(drawer).queryByRole("dialog", { name: "Hướng dẫn nhanh" })).not.toBeInTheDocument();

    await userEvent.click(within(drawer).getByRole("button", { name: "Mở hướng dẫn nhanh" }));

    expect(screen.getByRole("dialog", { name: "Thao tác khác" })).toBeInTheDocument();
    const coach = await within(drawer).findByRole("dialog", { name: "Hướng dẫn nhanh" });
    expect(coach).toHaveTextContent("Tìm người và di chuyển trên sơ đồ");
    expect(readGuidanceState(window.localStorage).workspaceCoach.chapters.overview).toBeUndefined();
  });

  it.each([
    ["OWNER", 3, true],
    ["LINKED", 3, true],
    ["READER", 2, false],
  ] as const)(
    "runs the capability-aware person Coach only in view mode for %s",
    async (role, expectedCount, hasActionStep) => {
      recordWorkspaceCoachStatus("overview", "skipped", window.localStorage);
      recordWorkspaceCoachStatus("actions", "completed", window.localStorage);
      recordWorkspaceCoachStatus("graph", "completed", window.localStorage);
      const context = contextFor(role);
      render(
        <TreeContext.Provider value={context}>
          <TreePageSlidePanel />
        </TreeContext.Provider>,
      );

      let coach = await screen.findByRole("dialog", { name: "Hướng dẫn nhanh" });
      const panel = coach.closest(".side-panel");
      const coachLayer = coach.closest(".workspace-coach-layer--person");
      expect(panel).not.toBeNull();
      expect(coachLayer?.parentElement).toHaveClass("side-panel__content");
      expect(panel?.querySelector('[data-panel-scroll-region="person"]')?.contains(coachLayer)).toBe(false);
      expect(coach).toHaveTextContent(`Bước 1 / ${expectedCount}`);
      expect(coach).toHaveTextContent("Xem thông tin và cách xưng hô");
      const addressAnchor = document.querySelector('[data-guidance-anchor="person-info-address"]');
      expect(addressAnchor).toHaveClass("person-info__address-callout");
      expect(addressAnchor).toHaveAttribute("data-guidance-highlight", "true");

      await userEvent.click(within(coach).getByRole("button", { name: "Tiếp theo" }));
      coach = screen.getByRole("dialog", { name: "Hướng dẫn nhanh" });
      if (hasActionStep) {
        expect(coach).toHaveTextContent(`Bước 2 / ${expectedCount}`);
        expect(coach).toHaveTextContent("Sửa thông tin và thêm thành viên");
        const actionsAnchor = document.querySelector('[data-guidance-anchor="person-actions"]');
        expect(actionsAnchor).toHaveClass("person-actions");
        expect(actionsAnchor).toHaveAttribute("data-guidance-highlight", "true");
        await userEvent.click(within(coach).getByRole("button", { name: "Tiếp theo" }));
        coach = screen.getByRole("dialog", { name: "Hướng dẫn nhanh" });
      }

      expect(coach).toHaveTextContent(`Bước ${expectedCount} / ${expectedCount}`);
      expect(coach).toHaveTextContent("Lưu ảnh kỷ niệm cho thành viên");
      const photosAnchor = document.querySelector('[data-guidance-anchor="person-claim-photos"]');
      expect(photosAnchor).toHaveClass("person-detail-section__header");
      expect(photosAnchor).toHaveAttribute("data-guidance-highlight", "true");
      expect(context.setEditMode).not.toHaveBeenCalled();
      expect(context.setAddRelativeMode).not.toHaveBeenCalled();
      expect(context.setEgoId).not.toHaveBeenCalled();

      await userEvent.click(within(coach).getByRole("button", { name: "Hoàn tất" }));
      expect(readGuidanceState(window.localStorage).workspaceCoach.chapters).toEqual({
        overview: "skipped",
        actions: "completed",
        graph: "completed",
        person: "completed",
      });
    },
  );

  it.each([
    ["view", false, false, false, "Bỏ chọn"],
    ["create", true, false, false, "Hủy"],
    ["edit", false, true, false, "Hủy chỉnh sửa"],
    ["add-relative", false, false, true, "Hủy thêm quan hệ"],
  ] as const)(
    "keeps fixed chrome and one scroll body in %s mode",
    async (mode, createMode, editMode, addRelativeMode, closeLabel) => {
      recordWorkspaceCoachStatus("person", "completed", window.localStorage);
      const context = contextFor("OWNER");
      context.createMode = createMode;
      context.editMode = editMode;
      context.addRelativeMode = addRelativeMode;

      render(
        <TreeContext.Provider value={context}>
          <TreePageSlidePanel />
        </TreeContext.Provider>,
      );

      const panel = document.querySelector<HTMLElement>(`.side-panel[data-panel-mode="${mode}"]`);
      expect(panel).not.toBeNull();
      const chrome = panel!.querySelector<HTMLElement>(".side-panel__chrome");
      const body = panel!.querySelector<HTMLElement>('[data-panel-scroll-region="person"]');
      expect(chrome).not.toBeNull();
      expect(body).not.toBeNull();
      expect(panel!.querySelectorAll('[data-panel-scroll-region="person"]')).toHaveLength(1);
      const closeButton = within(chrome!).getByRole("button", { name: closeLabel });
      expect(closeButton).toBeInTheDocument();
      expect(body!.contains(chrome)).toBe(false);

      await userEvent.click(closeButton);
      if (mode === "view") expect(context.setSelectedId).toHaveBeenCalledWith(null);
      if (mode === "create") expect(context.setCreateMode).toHaveBeenCalledWith(false);
      if (mode === "edit") expect(context.setEditMode).toHaveBeenCalledWith(false);
      if (mode === "add-relative") expect(context.setAddRelativeMode).toHaveBeenCalledWith(false);
    },
  );

  it("replays the person chapter from the fixed detail panel", async () => {
    recordWorkspaceCoachStatus("person", "completed", window.localStorage);
    const context = contextFor("READER");
    render(
      <TreeContext.Provider value={context}>
        <TreePageSlidePanel />
      </TreeContext.Provider>,
    );

    expect(screen.queryByRole("dialog", { name: "Hướng dẫn nhanh" })).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Mở hướng dẫn thông tin thành viên" }),
    );

    const coach = await screen.findByRole("dialog", { name: "Hướng dẫn nhanh" });
    expect(coach.closest('[data-coach-layer="person"]')).not.toBeNull();
    expect(coach).toHaveTextContent("Xem thông tin và cách xưng hô");
  });

  it.each(["edit", "add-relative"] as const)(
    "does not mount the person Coach while the %s form is active",
    async (mode) => {
      const context = contextFor("OWNER");
      context.editMode = mode === "edit";
      context.addRelativeMode = mode === "add-relative";
      render(
        <TreeContext.Provider value={context}>
          <TreePageSlidePanel />
        </TreeContext.Provider>,
      );

      expect(await screen.findByText(
        mode === "edit" ? "Biểu mẫu thành viên" : "Biểu mẫu quan hệ",
      )).toBeInTheDocument();
      expect(screen.queryByRole("dialog", { name: "Hướng dẫn nhanh" })).not.toBeInTheDocument();
      expect(readGuidanceState(window.localStorage).workspaceCoach.chapters.person).toBeUndefined();
    },
  );
});
