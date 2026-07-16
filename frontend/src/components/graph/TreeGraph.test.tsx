import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContextualCoachMarks } from "@/components/guidance/ContextualCoachMarks";
import { TreeGraph } from "./TreeGraph";
import { TreeGraphNavControls } from "./TreeGraphControls";
import { useState } from "react";
import { PersonInfoPanel } from "./PersonInfoPanel";
import { readGuidanceState, recordWorkspaceCoachStatus } from "@/lib/guidance/storage";
import {
  UNRESOLVED_LABEL,
  type Person,
  type Relationship,
  type ViewpointAddresses,
  type Address,
} from "@/lib/graph";

const GRAPH_CSS = readFileSync(
  resolve(process.cwd(), "src/components/graph/graph.css"),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

const persons: Person[] = [
  { id: "p1", displayName: "Ông Nội", gender: "male", birthYear: 1940 },
  { id: "p2", displayName: "Bố", gender: "male", birthYear: 1965, birthOrder: 1 },
  { id: "p3", displayName: "Cô Bạn", gender: "female", birthYear: 1966 },
  { id: "p4", displayName: "Bác Họ", gender: "male", birthYear: 1938 },
];

const relationships: Relationship[] = [
  // solid: derived bloodline
  {
    id: "r-solid",
    type: "bloodline_father",
    sourceId: "p1",
    targetId: "p2",
    derivationState: "derived",
  },
  // dashed: asserted
  {
    id: "r-dashed",
    type: "asserted",
    sourceId: "p2",
    targetId: "p4",
    derivationState: "asserted",
    assertedLabel: "bác",
  },
  // third distinct style: non-bloodline (social)
  {
    id: "r-social",
    type: "non_bloodline",
    sourceId: "p2",
    targetId: "p3",
    derivationState: "derived",
    socialType: "friend",
  },
];

/** Build a stub fetcher returning per-ego addresses. */
function stubFetcher(byEgo: Record<string, ViewpointAddresses>) {
  return vi.fn(async (_treeId: string, egoId: string) => {
    return (
      byEgo[egoId] ?? { egoId, addresses: [] }
    );
  });
}

function TreeGraphTestWrapper(props: any) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [address, setAddress] = useState<Address | undefined>(undefined);
  const selected = props.persons.find((p: any) => p.id === selectedId) || null;
  const ego = props.persons.find((p: any) => p.id === (props.initialEgoId || props.persons[0]?.id)) || null;

  return (
    <>
      <TreeGraph
        {...props}
        selectedId={selectedId}
        onSelectId={setSelectedId}
        onSelectAddress={setAddress}
      />
      <PersonInfoPanel person={selected} ego={ego} address={address} />
    </>
  );
}

function renderGraphNavControls(withSiblingActionsCoach = false) {
  const callbacks = {
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onCenterOnNode: vi.fn(),
    onResetZoom: vi.fn(),
    onToggleFullscreen: vi.fn(),
    onExportSVG: vi.fn(),
  };

  render(
    <>
      <TreeGraphNavControls
        {...callbacks}
        isFullscreen={false}
        activeSelectedId="p2"
        activeEgoId="p1"
      />
      {withSiblingActionsCoach ? (
        <>
          <button type="button" data-guidance-anchor="actions-review-anchor">
            Thao tác kiểm tra
          </button>
          <ContextualCoachMarks
            chapter="actions"
            role="reader"
            steps={[{
              topicId: "thao-tac-trong-cay",
              anchorIds: ["actions-review-anchor"],
            }]}
            enabled={true}
          />
        </>
      ) : null}
    </>,
  );

  return callbacks;
}

describe("TreeGraph renderer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.localStorage.clear();
    document.querySelectorAll<HTMLElement>("[data-guidance-highlight]").forEach((element) => {
      element.removeAttribute("data-guidance-highlight");
    });
  });

  it("renders the three edge styles so they are distinguishable by class and stroke-dasharray (5.3, 6.3, 12.4)", async () => {
    const fetchAddresses = stubFetcher({
      p1: { egoId: "p1", addresses: [] },
    });
    const { container } = render(
      <TreeGraph
        treeId="t1"
        persons={persons}
        relationships={relationships}
        initialEgoId="p1"
        fetchAddresses={fetchAddresses}
      />,
    );

    await waitFor(() => expect(fetchAddresses).toHaveBeenCalled());

    const solid = container.querySelector('[data-relationship-id="r-solid"]')!;
    const dashed = container.querySelector('[data-relationship-id="r-dashed"]')!;
    const social = container.querySelector('[data-relationship-id="r-social"]')!;

    expect(solid).toHaveClass("edge-solid");
    expect(dashed).toHaveClass("edge-dashed");
    expect(social).toHaveClass("edge-non-bloodline");

    // data-edge-style is unique per style
    const styles = [solid, dashed, social].map((e) => e.getAttribute("data-edge-style"));
    expect(new Set(styles).size).toBe(3);

    // stroke-dasharray differs for all three (visual distinction)
    const dashArrays = [solid, dashed, social].map((e) => e.getAttribute("stroke-dasharray"));
    expect(new Set(dashArrays).size).toBe(3);
  });

  it("shows a selected person's info and computed address relative to the viewpoint (8.1)", async () => {
    const fetchAddresses = stubFetcher({
      p1: {
        egoId: "p1",
        addresses: [
          { personId: "p2", resolved: "con", status: "resolved" },
        ],
      },
    });
    render(
      <TreeGraphTestWrapper
        treeId="t1"
        persons={persons}
        relationships={relationships}
        initialEgoId="p1"
        fetchAddresses={fetchAddresses}
      />,
    );

    await waitFor(() => expect(fetchAddresses).toHaveBeenCalled());

    // Select "Bố" (p2)
    await userEvent.click(screen.getByRole("button", { name: /Bố/ }));

    const panel = screen.getByRole("complementary");
    expect(within(panel).getByRole("heading", { name: "Bố" })).toBeInTheDocument();
    const address = panel.querySelector("[data-address]")!;
    expect(address).toHaveTextContent("Con");
    expect(address).toHaveAttribute("data-unresolved", "false");
  });

  it("marks an unresolved address with the unresolved indicator (8.7, 10.3)", async () => {
    const fetchAddresses = stubFetcher({
      p1: {
        egoId: "p1",
        addresses: [
          { personId: "p4", resolved: null, status: "unresolved" },
        ],
      },
    });
    render(
      <TreeGraphTestWrapper
        treeId="t1"
        persons={persons}
        relationships={relationships}
        initialEgoId="p1"
        fetchAddresses={fetchAddresses}
      />,
    );

    await waitFor(() => expect(fetchAddresses).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: /Bác Họ/ }));
    const panel = screen.getByRole("complementary");
    const address = panel.querySelector("[data-address]")!;
    expect(address).toHaveTextContent(UNRESOLVED_LABEL);
    expect(address).toHaveAttribute("data-unresolved", "true");
  });

  it("re-fetches and re-renders every node's address when the viewpoint changes (10.1, 10.2)", async () => {
    const fetchAddresses = stubFetcher({
      p1: {
        egoId: "p1",
        addresses: [
          { personId: "p2", resolved: "con", status: "resolved" },
          { personId: "p4", resolved: "anh", status: "resolved" },
        ],
      },
      p2: {
        egoId: "p2",
        addresses: [
          { personId: "p1", resolved: "bố", status: "resolved" },
          { personId: "p4", resolved: "bác", status: "resolved" },
        ],
      },
    });

    render(
      <TreeGraph
        treeId="t1"
        persons={persons}
        relationships={relationships}
        initialEgoId="p1"
        fetchAddresses={fetchAddresses}
      />,
    );

    // Initial viewpoint p1: p2's node shows "con".
    await waitFor(() => {
      const node = document.querySelector('.tree-graph__node[data-person-id="p2"] [data-address]');
      expect(node).toHaveTextContent("Con");
    });
    expect(fetchAddresses).toHaveBeenCalledWith("t1", "p1", expect.anything());

    // Change the viewpoint to p2.
    await userEvent.selectOptions(
      screen.getByLabelText(/Cách xưng hô hiển thị theo/),
      "p2",
    );

    // After the switch the same node now addresses p1 differently and the
    // backend was queried for the new ego (10.1, 10.2).
    await waitFor(() => {
      const node = document.querySelector('.tree-graph__node[data-person-id="p1"] [data-address]');
      expect(node).toHaveTextContent("Bố");
    });
    expect(fetchAddresses).toHaveBeenCalledWith("t1", "p2", expect.anything());

    // p4's displayed address updated from "anh" (ego p1) to "bác" (ego p2).
    await waitFor(() => {
      const node = document.querySelector('.tree-graph__node[data-person-id="p4"] [data-address]');
      expect(node).toHaveTextContent("Bác");
    });
  });

  it("labels the ego node as self rather than an address", async () => {
    const fetchAddresses = stubFetcher({ p1: { egoId: "p1", addresses: [] } });
    render(
      <TreeGraph
        treeId="t1"
        persons={persons}
        relationships={relationships}
        initialEgoId="p1"
        fetchAddresses={fetchAddresses}
      />,
    );
    await waitFor(() => expect(fetchAddresses).toHaveBeenCalled());
    const egoNode = document.querySelector('.tree-graph__node[data-ego="true"] [data-address]');
    expect(egoNode).toHaveTextContent("Bản thân");
  });

  it("renders card features like gender themes, deceased markers, and claimed badges", async () => {
    const fetchAddresses = stubFetcher({ p1: { egoId: "p1", addresses: [] } });
    const mockPersons: Person[] = [
      { id: "p1", displayName: "Người 1", gender: "male", birthYear: 1980, claimed: true },
      { id: "p2", displayName: "Người 2", gender: "female", birthYear: 1985, deceased: true },
    ];
    const mockRelationships: Relationship[] = [
      {
        id: "r-card-regression",
        type: "bloodline_mother",
        sourceId: "p2",
        targetId: "p1",
        derivationState: "derived",
      },
    ];
    render(
      <TreeGraph
        treeId="t1"
        persons={mockPersons}
        relationships={mockRelationships}
        initialEgoId="p1"
        fetchAddresses={fetchAddresses}
      />,
    );

    await waitFor(() => expect(fetchAddresses).toHaveBeenCalled());

    const node1 = document.querySelector('.tree-graph__node[data-person-id="p1"]')!;
    const node2 = document.querySelector('.tree-graph__node[data-person-id="p2"]')!;

    // Gender themes in classes
    expect(node1).toHaveClass("tree-graph__node--male");
    expect(node2).toHaveClass("tree-graph__node--female");

    // Deceased classes
    expect(node1).not.toHaveClass("tree-graph__node--deceased");
    expect(node2).toHaveClass("tree-graph__node--deceased");

    // Claimed badge
    expect(node1.querySelector(".tree-graph__node-claimed-badge")).toBeInTheDocument();
    expect(node2.querySelector(".tree-graph__node-claimed-badge")).not.toBeInTheDocument();

    // Lifespan rendering
    expect(node1.querySelector(".tree-graph__node-lifespan")).toHaveTextContent("(s. 1980)");
    expect(node2.querySelector(".tree-graph__node-lifespan")).toHaveTextContent("(1985 - †)");
  });

  it("marks a boundary spouse node that has a collapsed extended family branch", async () => {
    const fetchAddresses = stubFetcher({ ego: { egoId: "ego", addresses: [] } });
    const branchPersons: Person[] = [
      { id: "ego", displayName: "Ego", gender: "male" },
      { id: "father", displayName: "Cha", gender: "male" },
      { id: "aunt", displayName: "Cô", gender: "female" },
      { id: "uncleInLaw", displayName: "Dượng", gender: "male" },
      { id: "inLawFather", displayName: "Cha dượng", gender: "male" },
    ];
    const branchRelationships: Relationship[] = [
      {
        id: "r-f-ego",
        type: "bloodline_father",
        sourceId: "father",
        targetId: "ego",
        derivationState: "derived",
      },
      {
        id: "r-f-aunt",
        type: "bloodline_father",
        sourceId: "father",
        targetId: "aunt",
        derivationState: "derived",
      },
      {
        id: "r-marriage",
        type: "marriage",
        sourceId: "aunt",
        targetId: "uncleInLaw",
        derivationState: "derived",
        maritalStatus: "married",
      },
      {
        id: "r-f-inlaw",
        type: "bloodline_father",
        sourceId: "inLawFather",
        targetId: "uncleInLaw",
        derivationState: "derived",
      },
    ];

    render(
      <TreeGraph
        treeId="t1"
        persons={branchPersons}
        relationships={branchRelationships}
        initialEgoId="ego"
        fetchAddresses={fetchAddresses}
      />,
    );

    await waitFor(() => expect(fetchAddresses).toHaveBeenCalled());

    const uncleNode = document.querySelector('.tree-graph__node[data-person-id="uncleInLaw"]')!;
    expect(within(uncleNode as HTMLElement).getByLabelText("Có nhánh mở rộng")).toBeInTheDocument();
    expect(document.querySelector('.tree-graph__node[data-person-id="inLawFather"]')).not.toBeInTheDocument();
  });

  it("expands node width for long display names instead of truncating the card", async () => {
    const fetchAddresses = stubFetcher({ p1: { egoId: "p1", addresses: [] } });
    const longName = "Phạm Văn Dượng Gia Đình Nhánh Mở Rộng";
    const longNamePersons: Person[] = [
      { id: "p1", displayName: longName, gender: "male", birthYear: 1985 },
    ];

    render(
      <TreeGraph
        treeId="t1"
        persons={longNamePersons}
        relationships={[]}
        initialEgoId="p1"
        fetchAddresses={fetchAddresses}
      />,
    );

    await waitFor(() => expect(fetchAddresses).toHaveBeenCalled());

    const node = document.querySelector('.tree-graph__node[data-person-id="p1"]')!;
    const card = within(node as HTMLElement).getByRole("button", { name: new RegExp(longName) });
    const foreignObject = card.closest("foreignObject")!;

    expect(foreignObject).toHaveAttribute("width", expect.not.stringMatching(/^220$/));
    expect(card.querySelector(".tree-graph__node-name")).toHaveTextContent(longName);
  });

  it("supports switching tabs (Chi tiết vs Tiểu sử) in PersonInfoPanel", async () => {
    const fetchAddresses = stubFetcher({
      p1: { egoId: "p1", addresses: [{ personId: "p1", resolved: null, status: "resolved" }] },
    });
    render(
      <TreeGraphTestWrapper
        treeId="t1"
        persons={[{ id: "p1", displayName: "Bố", gender: "male", birthYear: 1965, deceased: true }]}
        relationships={[]}
        initialEgoId="p1"
        fetchAddresses={fetchAddresses}
      />,
    );

    await waitFor(() => expect(fetchAddresses).toHaveBeenCalled());
    await userEvent.click(screen.getByRole("button", { name: /Bố/ }));

    // Verify info tab content is displayed initially
    expect(screen.getByText("Giới tính")).toBeInTheDocument();

    // Switch to biography tab
    const bioTabButton = screen.getByRole("tab", { name: /Tiểu sử/ });
    await userEvent.click(bioTabButton);

    // Verify timeline event is rendered
    expect(screen.queryByText("Giới tính")).not.toBeInTheDocument();
    expect(screen.getByText("Sinh năm 1965.")).toBeInTheDocument();
    expect(screen.getAllByText("†").length).toBeGreaterThan(0);
  });

  it("links PersonInfoPanel tabs to their panels and supports arrow-key navigation", async () => {
    const user = userEvent.setup();
    render(
      <PersonInfoPanel
        person={{
          id: "p1",
          displayName: "Bố",
          gender: "male",
          birthYear: 1965,
        }}
        ego={null}
        address={undefined}
      />,
    );

    const infoTab = screen.getByRole("tab", { name: "Chi tiết" });
    const infoPanel = screen.getByRole("tabpanel", { name: "Chi tiết" });
    const bioTab = screen.getByRole("tab", { name: "Tiểu sử & Sự kiện" });

    expect(infoTab).toHaveAttribute("aria-selected", "true");
    expect(infoTab).toHaveAttribute("aria-controls", infoPanel.id);
    expect(infoPanel).toHaveAttribute("aria-labelledby", infoTab.id);

    await user.tab();
    expect(infoTab).toHaveFocus();
    await user.keyboard("{ArrowRight}");

    expect(bioTab).toHaveFocus();
    expect(bioTab).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("tabpanel", { name: "Tiểu sử & Sự kiện" }),
    ).toHaveTextContent("Sinh năm 1965.");
  });

  it("filters the tree view when branch focus view is toggled", async () => {
    const fetchAddresses = vi.fn(async () => ({ egoId: "p1", addresses: [] }));
    const mockPersons: Person[] = [
      { id: "p1", displayName: "Ông", gender: "male" },
      { id: "p2", displayName: "Bố", gender: "male" },
      { id: "p3", displayName: "Con", gender: "male" },
    ];
    const mockRelationships = [
      { id: "r1", type: "bloodline_father", sourceId: "p1", targetId: "p2", derivationState: "derived" },
      { id: "r2", type: "bloodline_father", sourceId: "p2", targetId: "p3", derivationState: "derived" },
    ] as Relationship[];

    render(
      <TreeGraph
        treeId="t1"
        persons={mockPersons}
        relationships={mockRelationships}
        initialEgoId="p1"
        fetchAddresses={fetchAddresses}
      />,
    );

    await waitFor(() => expect(fetchAddresses).toHaveBeenCalled());

    // Initially all nodes are rendered
    expect(document.querySelector('.tree-graph__node[data-person-id="p1"]')).toBeInTheDocument();
    expect(document.querySelector('.tree-graph__node[data-person-id="p2"]')).toBeInTheDocument();
    expect(document.querySelector('.tree-graph__node[data-person-id="p3"]')).toBeInTheDocument();

    // Select "Bố" (p2)
    await userEvent.click(screen.getByRole("button", { name: /Bố/ }));

    // Click "Xem riêng nhánh này"
    const focusBtn = screen.getByRole("button", { name: /Xem riêng nhánh này/ });
    await userEvent.click(focusBtn);

    // After focus is active, "Ông" (p1) should be filtered out
    expect(document.querySelector('.tree-graph__node[data-person-id="p1"]')).not.toBeInTheDocument();
    expect(document.querySelector('.tree-graph__node[data-person-id="p2"]')).toBeInTheDocument();
    expect(document.querySelector('.tree-graph__node[data-person-id="p3"]')).toBeInTheDocument();

    // Toggle off
    await userEvent.click(screen.getByRole("button", { name: /Hiện toàn bộ cây/ }));

    // All nodes should be back
    expect(document.querySelector('.tree-graph__node[data-person-id="p1"]')).toBeInTheDocument();
  });

  it("renders a joint parent-child connector when both parents are in the tree and married", async () => {
    const fetchAddresses = vi.fn(async () => ({ egoId: "p3", addresses: [] }));
    const mockPersons: Person[] = [
      { id: "p1", displayName: "Father", gender: "male" },
      { id: "p2", displayName: "Mother", gender: "female" },
      { id: "p3", displayName: "Child", gender: "male" },
    ];
    const mockRelationships = [
      { id: "r-marriage", type: "marriage", sourceId: "p1", targetId: "p2", derivationState: "derived" },
      { id: "r-father", type: "bloodline_father", sourceId: "p1", targetId: "p3", derivationState: "derived" },
      { id: "r-mother", type: "bloodline_mother", sourceId: "p2", targetId: "p3", derivationState: "derived" },
    ] as Relationship[];

    render(
      <TreeGraph
        treeId="t1"
        persons={mockPersons}
        relationships={mockRelationships}
        initialEgoId="p3"
        fetchAddresses={fetchAddresses}
      />,
    );

    await waitFor(() => expect(fetchAddresses).toHaveBeenCalled());

    // Should find the joint edge path
    const jointPath = document.querySelector('path[data-joint-child-id="p3"]');
    expect(jointPath).toBeInTheDocument();

    // The individual father and mother edges should NOT be rendered separately
    expect(document.querySelector('[data-relationship-id="r-father"]')).not.toBeInTheDocument();
    expect(document.querySelector('[data-relationship-id="r-mother"]')).not.toBeInTheDocument();
  });

  it("provides functional navigation controls (zoom, reset, fullscreen, export)", async () => {
    const fetchAddresses = vi.fn(async () => ({ egoId: "p1", addresses: [] }));
    render(
      <TreeGraph
        treeId="t1"
        persons={persons}
        relationships={relationships}
        initialEgoId="p1"
        fetchAddresses={fetchAddresses}
      />,
    );

    await waitFor(() => expect(fetchAddresses).toHaveBeenCalled());

    const controlsToggle = screen.getByRole("button", { name: "Điều khiển sơ đồ" });
    expect(controlsToggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(controlsToggle);
    expect(controlsToggle).toHaveAttribute("aria-expanded", "true");

    const zoomInBtn = screen.getByTitle("Phóng to");
    const zoomOutBtn = screen.getByTitle("Thu nhỏ");
    const resetBtn = screen.getByTitle("Đặt lại góc nhìn");
    const exportBtn = screen.getByTitle("Tải ảnh sơ đồ (SVG)");
    const fullscreenBtn = screen.getByTitle("Toàn màn hình");

    expect(zoomInBtn).toBeInTheDocument();
    expect(zoomOutBtn).toBeInTheDocument();
    expect(resetBtn).toBeInTheDocument();
    expect(exportBtn).toBeInTheDocument();
    expect(fullscreenBtn).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Căn giữa người đang xem" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hiện chú giải sơ đồ" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hướng dẫn đầy đủ" })).toHaveAttribute("href", "/help");

    // Select a node to see the center button
    await userEvent.click(screen.getByRole("button", { name: /Bố/ }));
    const centerBtn = await screen.findByTitle("Căn giữa người được chọn");
    expect(centerBtn).toBeInTheDocument();

    // Click controls to ensure they don't crash
    await userEvent.click(zoomInBtn);
    await userEvent.click(zoomOutBtn);
    await userEvent.click(centerBtn);
    await userEvent.click(resetBtn);

    // Mock document.exitFullscreen to avoid error during testing if fullscreen isn't supported in JSDOM
    document.exitFullscreen = vi.fn().mockResolvedValue(undefined);
    const mockRequestFullscreen = vi.fn().mockResolvedValue(undefined);

    // Test fullscreen button
    const canvasContainer = document.querySelector(".tree-graph");
    if (canvasContainer) {
      canvasContainer.requestFullscreen = mockRequestFullscreen;
      await userEvent.click(fullscreenBtn);
      expect(mockRequestFullscreen).toHaveBeenCalled();
    }
  });

  it("starts the three-step graph Coach only after controls expand", async () => {
    recordWorkspaceCoachStatus("overview", "skipped", window.localStorage);
    recordWorkspaceCoachStatus("actions", "completed", window.localStorage);
    recordWorkspaceCoachStatus("person", "skipped", window.localStorage);
    const callbacks = renderGraphNavControls();
    expect(screen.queryByRole("dialog", { name: "Hướng dẫn nhanh" })).not.toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: "Điều khiển sơ đồ" });
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    let coach = await screen.findByRole("dialog", { name: "Hướng dẫn nhanh" });
    const graphLayers = document.querySelectorAll<HTMLElement>('[data-coach-layer="graph"]');
    expect(graphLayers).toHaveLength(1);
    expect(graphLayers[0]).toHaveClass(
      "workspace-coach-layer",
      "workspace-coach-layer--graph",
    );
    expect(
      document.querySelector(".workspace-coach-layer--graph .workspace-coach-layer--graph"),
    ).toBeNull();
    expect(coach).toHaveTextContent("Bước 1 / 3");
    expect(coach).toHaveTextContent("Tìm người và di chuyển trên sơ đồ");
    expect(screen.getByTitle("Phóng to")).toHaveAttribute("data-guidance-highlight", "true");

    await userEvent.click(within(coach).getByRole("button", { name: "Tiếp theo" }));
    coach = screen.getByRole("dialog", { name: "Hướng dẫn nhanh" });
    expect(coach).toHaveTextContent("Bước 2 / 3");
    expect(coach).toHaveTextContent("Xem và lưu sơ đồ");
    expect(screen.getByRole("button", { name: "Căn giữa người đang xem" })).toHaveAttribute(
      "data-guidance-highlight",
      "true",
    );

    await userEvent.click(within(coach).getByRole("button", { name: "Tiếp theo" }));
    coach = screen.getByRole("dialog", { name: "Hướng dẫn nhanh" });
    expect(coach).toHaveTextContent("Bước 3 / 3");
    expect(coach).toHaveTextContent("Đọc đường quan hệ");
    expect(screen.getByRole("button", { name: "Tải SVG" })).toHaveAttribute(
      "data-guidance-highlight",
      "true",
    );
    await userEvent.click(within(coach).getByRole("button", { name: "Hoàn tất" }));

    Object.values(callbacks).forEach((callback) => expect(callback).not.toHaveBeenCalled());
    const stored = readGuidanceState(window.localStorage);
    expect(stored.workspaceCoach.chapters.graph).toBe("completed");
    expect(stored.workspaceCoach.chapters.overview).toBe("skipped");
    expect(stored.workspaceCoach.chapters.actions).toBe("completed");
    expect(stored.workspaceCoach.chapters.person).toBe("skipped");
  });

  it("replays only the graph Coach while keeping controls expanded and Help available", async () => {
    recordWorkspaceCoachStatus("overview", "skipped", window.localStorage);
    recordWorkspaceCoachStatus("actions", "completed", window.localStorage);
    recordWorkspaceCoachStatus("person", "skipped", window.localStorage);
    recordWorkspaceCoachStatus("graph", "completed", window.localStorage);
    const callbacks = renderGraphNavControls(true);

    const toggle = screen.getByRole("button", { name: "Điều khiển sơ đồ" });
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("dialog", { name: "Hướng dẫn nhanh" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hướng dẫn đầy đủ" })).toHaveAttribute("href", "/help");

    await userEvent.click(screen.getByRole("button", { name: "Mở hướng dẫn nhanh sơ đồ" }));

    const coach = await screen.findByRole("dialog", { name: "Hướng dẫn nhanh" });
    expect(coach).toHaveTextContent("Tìm người và di chuyển trên sơ đồ");
    expect(screen.getAllByRole("dialog", { name: "Hướng dẫn nhanh" })).toHaveLength(1);
    expect(screen.queryByText("Làm quen với các thao tác trong cây")).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    Object.values(callbacks).forEach((callback) => expect(callback).not.toHaveBeenCalled());
    expect(readGuidanceState(window.localStorage).workspaceCoach.chapters).toEqual({
      overview: "skipped",
      actions: "completed",
      person: "skipped",
      graph: "completed",
    });
  });

  it("keeps exactly eight primary controls in the 4x2 grid and secondary actions outside", async () => {
    recordWorkspaceCoachStatus("graph", "completed", window.localStorage);
    renderGraphNavControls();

    await userEvent.click(screen.getByRole("button", { name: "Điều khiển sơ đồ" }));

    const grid = document.querySelector<HTMLElement>(".tree-graph__nav-grid");
    expect(grid).not.toBeNull();
    expect(
      Array.from(grid!.children).map((control) => control.textContent?.replace(/\s+/g, " ").trim()),
    ).toEqual([
      "Phóng to",
      "Thu nhỏ",
      "Về người đang xem",
      "Đặt lại",
      "Tải SVG",
      "Toàn màn hình",
      "Chú giải",
      "Hướng dẫn nhanh",
    ]);
    expect(grid!.children).toHaveLength(8);

    const selectedCenter = screen.getByRole("button", { name: "Căn giữa người được chọn" });
    const fullHelp = screen.getByRole("link", { name: "Hướng dẫn đầy đủ" });
    expect(grid).not.toContainElement(selectedCenter);
    expect(grid).not.toContainElement(fullHelp);
    expect(fullHelp).toHaveTextContent("Hướng dẫn đầy đủ");
  });

  it("uses a four-column primary grid and a dedicated floating graph Coach layer", () => {
    expect(GRAPH_CSS).toMatch(
      /\.tree-graph__nav-grid\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s,
    );
    expect(GRAPH_CSS).toMatch(
      /\.tree-graph__nav-grid > \.tree-graph__nav-button[\s\S]*?min-height:\s*(?:[4-9]\d|\d{3,})px[\s\S]*?flex-direction:\s*column/,
    );
    expect(GRAPH_CSS).toMatch(
      /\.tree-graph__nav-shell\s*\{[^}]*position:\s*absolute[^}]*inset:\s*0[^}]*pointer-events:\s*none/s,
    );
    expect(GRAPH_CSS).toMatch(
      /\.workspace-coach-layer--graph\s*\{[^}]*position:\s*absolute[^}]*top:\s*0\.75rem[^}]*right:\s*0\.75rem[^}]*bottom:\s*auto/s,
    );
    expect(GRAPH_CSS).toMatch(
      /@container tree-surface \(min-width: 960px\)[\s\S]*?\.tree-graph__nav-palette\s*\{[^}]*top:\s*0\.75rem[^}]*right:\s*0\.75rem[^}]*bottom:\s*auto[\s\S]*?\.workspace-coach-layer--graph\s*\{[^}]*right:\s*auto[^}]*left:\s*0\.75rem[^}]*width:\s*min\(21rem,\s*calc\(100%\s*-\s*23\.25rem\)\)/,
    );
    expect(GRAPH_CSS).not.toMatch(/\.tree-graph__nav-shell:has\(/);
  });

  it("does not reset the user's graph view when selecting a person", async () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(900);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(600);
    const fetchAddresses = vi.fn(async () => ({ egoId: "p1", addresses: [] }));

    render(
      <TreeGraphTestWrapper
        treeId="t1"
        persons={persons}
        relationships={relationships}
        initialEgoId="p1"
        fetchAddresses={fetchAddresses}
      />,
    );

    await waitFor(() => expect(fetchAddresses).toHaveBeenCalled());
    await userEvent.click(screen.getByRole("button", { name: "Điều khiển sơ đồ" }));
    await userEvent.click(screen.getByTitle("Phóng to"));

    const viewport = document.querySelector(".tree-graph__svg > g")!;
    const transformBeforeSelection = viewport.getAttribute("transform");
    await userEvent.click(screen.getByRole("button", { name: /Bố/ }));
    await screen.findByRole("complementary");

    expect(viewport).toHaveAttribute("transform", transformBeforeSelection);
  });

  it("scopes SVG export to its own container when multiple graphs exist", async () => {
    const fetchAddresses = vi.fn(async () => ({ egoId: "p1", addresses: [] }));
    render(
      <div data-testid="multi-graph-container">
        <TreeGraph
          treeId="t1"
          persons={persons}
          relationships={relationships}
          initialEgoId="p1"
          fetchAddresses={fetchAddresses}
        />
        <TreeGraph
          treeId="t2"
          persons={[{ id: "other", displayName: "Other", gender: "male" }]}
          relationships={[]}
          initialEgoId="other"
          fetchAddresses={fetchAddresses}
        />
      </div>
    );

    await waitFor(() => expect(fetchAddresses).toHaveBeenCalledTimes(2));

    // Mock the export APIs
    const mockCreateObjectURL = vi.fn().mockReturnValue("blob:mock");
    const mockRevokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    });

    const mockSerializeToString = vi.fn().mockReturnValue("<svg>mocked</svg>");
    vi.stubGlobal("XMLSerializer", vi.fn().mockImplementation(() => ({
      serializeToString: mockSerializeToString,
    })));

    // Prevent navigation error from link.click()
    const mockClick = vi.spyOn(window.HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    // Ensure both graphs have rendered their nodes
    await waitFor(() => {
      expect(document.querySelector('[data-person-id="p1"]')).toBeInTheDocument();
      expect(document.querySelector('[data-person-id="other"]')).toBeInTheDocument();
    });

    const exportBtns = screen.getAllByTitle("Tải ảnh sơ đồ (SVG)");
    expect(exportBtns).toHaveLength(2);

    // Click export on the second graph
    await userEvent.click(exportBtns[1]);

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();

    // Check if the serialized SVG was the second one (width depends on the layout, but the clone itself should be serialized)
    const calls = mockSerializeToString.mock.calls;
    expect(calls.length).toBe(1);
    const serializedNode = calls[0][0] as SVGSVGElement;

    // We can verify it was from the second graph because it will only have the "other" person node, not "p1"
    const hasP1 = serializedNode.querySelector('[data-person-id="p1"]');
    const hasOther = serializedNode.querySelector('[data-person-id="other"]');

    expect(hasP1).toBeNull();
    expect(hasOther).toBeTruthy();
  });
});
