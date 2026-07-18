import { resolve } from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { compile } from "sass";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Capabilities, Person, TreeAccessRole } from "@/lib/graph";
import { readGuidanceState, recordWorkspaceCoachStatus } from "@/lib/guidance/storage";
import type { TreeContextType } from "./TreeContext";
import { TreeContext } from "./TreeContext";
import { TreePageHeader } from "./TreePageHeader";
import { TreePageSlidePanel } from "./TreePageSlidePanel";

const treeWorkspaceStyles = compile(
  resolve(process.cwd(), "src/styles/_03_tree_workspace.scss"),
  { silenceDeprecations: ["import"] },
).css;

vi.mock("@/app/providers", () => ({
  useSession: () => ({ user: { userId: "user-1" }, loading: false }),
}));
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
vi.mock("@/components/person/PersonForm", () => ({
  PersonForm: ({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) => (
    <div>
      Biểu mẫu thành viên
      <button type="button" onClick={() => onDirtyChange?.(true)}>Sửa thử</button>
    </div>
  ),
}));
vi.mock("@/components/person/AddConnectedPersonForm", () => ({ AddConnectedPersonForm: () => <div>Biểu mẫu thêm người mới</div> }));
vi.mock("@/components/person/UpdateRelationshipForm", () => ({ UpdateRelationshipForm: () => <div>Biểu mẫu cập nhật quan hệ</div> }));
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
    personPanelMode: "view",
    isSettingsOpen: false,
    isCollaborationOpen: false,
    accessRole: role,
    capabilities: treeCapabilities,
    isOwner: role === "OWNER",
    isCollaborator: role === "CONTRIBUTOR",
    canEdit: treeCapabilities.editContent,
    guidanceRole: role === "OWNER" ? "owner" : role === "CONTRIBUTOR" ? "editor" : "reader",
    setEgoId: noop,
    selectPerson: noop,
    openPersonPanel: noop,
    backPersonPanel: noop,
    closePersonPanel: noop,
    showCreatedPerson: noop,
    setFocusId: noop,
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
  it("targets add-person at the selected editable person before the viewpoint person", async () => {
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

    const button = screen.getByRole("button", { name: "Thêm người mới" });
    await userEvent.click(button);
    expect(context.openPersonPanel).toHaveBeenCalledWith(selected.id, "add-person", button);
  });

  it("shows compact context, content, and administration actions to the owner", async () => {
    renderRole("OWNER");
    const header = screen.getByRole("banner");
    expect(screen.getByRole("link", { name: "Các cây" })).toBeInTheDocument();
    expect(within(header).getByText("Xét vai vế theo")).toBeInTheDocument();
    expect(within(header).getByText("Nguyễn Văn Minh")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đổi người xét" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thêm người mới" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chỉnh sửa thông tin" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cập nhật quan hệ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đang dùng để xét vai vế" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Thao tác khác" }));
    const actionDrawer = screen.getByRole("dialog", { name: "Thao tác khác" });
    expect(screen.getByRole("button", { name: "Cộng tác" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cài đặt cây" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thêm thành viên khác" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sửa người đang chọn" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tìm người" })).not.toBeInTheDocument();
    expect(within(actionDrawer).queryByRole("button", { name: "Đổi người xét" })).not.toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: "Thêm người mới" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chỉnh sửa thông tin" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cập nhật quan hệ" })).toBeInTheDocument();
    expect(screen.queryByText("Mời xác nhận")).not.toBeInTheDocument();
    expect(screen.getByTestId("photos")).toHaveAttribute("data-can-edit", "true");
    await userEvent.click(screen.getByRole("button", { name: "Thao tác khác" }));
    expect(screen.queryByRole("button", { name: "Cộng tác" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cài đặt cây" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thêm thành viên khác" })).not.toBeInTheDocument();
  });

  it("lets linked users edit their own node and photos but not the tree structure", async () => {
    renderRole("LINKED");
    expect(screen.queryByRole("button", { name: "Thêm người mới" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chỉnh sửa thông tin" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cập nhật quan hệ" })).not.toBeInTheDocument();
    expect(screen.queryByText("Mời xác nhận")).not.toBeInTheDocument();
    expect(screen.getByTestId("photos")).toHaveAttribute("data-can-edit", "true");
    await userEvent.click(screen.getByRole("button", { name: "Thao tác khác" }));
    expect(screen.queryByRole("button", { name: "Cộng tác" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thêm thành viên khác" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sửa người đang chọn" })).not.toBeInTheDocument();
  });

  it("keeps reader actions read-only while preserving help", async () => {
    renderRole("READER");
    expect(screen.queryByRole("button", { name: "Thêm người mới" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Chỉnh sửa thông tin" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cập nhật quan hệ" })).not.toBeInTheDocument();
    expect(screen.queryByText("Mời xác nhận")).not.toBeInTheDocument();
    expect(screen.getByTestId("photos")).toHaveAttribute("data-can-edit", "false");
    await userEvent.click(screen.getByRole("button", { name: "Thao tác khác" }));
    const actionDrawer = screen.getByRole("dialog", { name: "Thao tác khác" });
    expect(screen.queryByRole("button", { name: "Cộng tác" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thêm thành viên khác" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sửa người đang chọn" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tìm người" })).not.toBeInTheDocument();
    expect(within(actionDrawer).queryByRole("button", { name: "Đổi người xét" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mở hướng dẫn nhanh" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Trung tâm hướng dẫn" })).toBeInTheDocument();
  });

  it.each(["OWNER", "CONTRIBUTOR", "LINKED", "READER"] as const)(
    "starts the capability-aware actions Coach once for %s",
    async (role) => {
      const context = contextFor(role);
      render(
        <TreeContext.Provider value={context}>
          <TreePageHeader />
        </TreeContext.Provider>,
      );

      expect(screen.queryByRole("dialog", { name: "Hướng dẫn nhanh" })).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Thao tác khác" }));

      const drawer = screen.getByRole("dialog", { name: "Thao tác khác" });
      const coach = await within(drawer).findByRole("dialog", { name: "Hướng dẫn nhanh" });
      expect(coach).toHaveTextContent("Bước 1 / 1");
      expect(coach).toHaveTextContent("Làm quen với các thao tác trong cây");
      expect(context.selectPerson).not.toHaveBeenCalled();
      expect(context.setEgoId).not.toHaveBeenCalled();
      expect(context.openPersonPanel).not.toHaveBeenCalled();

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
    expect(coach).toHaveTextContent("Làm quen với các thao tác trong cây");
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
        expect(coach).toHaveTextContent("Sửa thông tin và cập nhật quan hệ");
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
      expect(context.openPersonPanel).not.toHaveBeenCalled();
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
    ["view"],
    ["edit"],
    ["add-person"],
    ["update-relationship"],
  ] as const)(
    "keeps fixed chrome and one scroll body in %s mode",
    async (mode) => {
      recordWorkspaceCoachStatus("person", "completed", window.localStorage);
      const context = contextFor("OWNER");
      context.personPanelMode = mode;

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
      const closeButton = within(chrome!).getByRole("button", { name: "Đóng bảng thông tin thành viên" });
      expect(closeButton).toBeInTheDocument();
      expect(body!.contains(chrome)).toBe(false);
      if (mode !== "view") {
        expect(within(chrome!).getByRole("button", { name: "Quay lại thông tin thành viên" })).toBeInTheDocument();
      }

      await userEvent.click(closeButton);
      expect(context.closePersonPanel).toHaveBeenCalledTimes(1);
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

  it.each(["edit", "add-person", "update-relationship"] as const)(
    "does not mount the person Coach while the %s form is active",
    async (mode) => {
      const context = contextFor("OWNER");
      context.personPanelMode = mode;
      render(
        <TreeContext.Provider value={context}>
          <TreePageSlidePanel />
        </TreeContext.Provider>,
      );

      expect(await screen.findByText(
        mode === "edit"
          ? "Biểu mẫu thành viên"
          : mode === "add-person"
            ? "Biểu mẫu thêm người mới"
            : "Biểu mẫu cập nhật quan hệ",
      )).toBeInTheDocument();
      expect(screen.queryByRole("dialog", { name: "Hướng dẫn nhanh" })).not.toBeInTheDocument();
      expect(readGuidanceState(window.localStorage).workspaceCoach.chapters.person).toBeUndefined();
    },
  );

  it.each(["back", "close", "escape"] as const)(
    "asks before discarding dirty edits on %s",
    async (action) => {
      recordWorkspaceCoachStatus("person", "completed", window.localStorage);
      const context = contextFor("OWNER");
      context.personPanelMode = "edit";
      render(
        <TreeContext.Provider value={context}>
          <TreePageSlidePanel />
        </TreeContext.Provider>,
      );

      await userEvent.click(screen.getByRole("button", { name: "Sửa thử" }));
      if (action === "back") {
        await userEvent.click(screen.getByRole("button", { name: "Quay lại thông tin thành viên" }));
      } else if (action === "close") {
        await userEvent.click(screen.getByRole("button", { name: "Đóng bảng thông tin thành viên" }));
      } else {
        await userEvent.keyboard("{Escape}");
      }

      const dialog = screen.getByRole("alertdialog", { name: "Bỏ các thay đổi?" });
      expect(dialog).toBeInTheDocument();
      expect(context.backPersonPanel).not.toHaveBeenCalled();
      expect(context.closePersonPanel).not.toHaveBeenCalled();

      await userEvent.click(within(dialog).getByRole("button", { name: "Bỏ thay đổi" }));
      if (action === "back") expect(context.backPersonPanel).toHaveBeenCalledTimes(1);
      else expect(context.closePersonPanel).toHaveBeenCalledTimes(1);
    },
  );
});
