import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TreeGraph } from "./TreeGraph";
import { useState } from "react";
import { PersonInfoPanel } from "./PersonInfoPanel";
import {
  UNRESOLVED_LABEL,
  type Person,
  type Relationship,
  type ViewpointAddresses,
  type Address,
} from "@/lib/graph";

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

describe("TreeGraph renderer", () => {
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
      screen.getByLabelText(/Góc nhìn/),
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
    render(
      <TreeGraph
        treeId="t1"
        persons={mockPersons}
        relationships={[]}
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
});
