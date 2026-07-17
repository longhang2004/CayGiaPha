import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import {
  GUIDANCE_REOPEN_EVENT,
  GUIDANCE_STORAGE_KEY,
  readGuidanceState,
  reopenGuidanceChapter,
} from "@/lib/guidance/storage";
import {
  CoachMarkCard,
  type CoachStep,
  type UseCoachMarkSequenceOptions,
  useCoachMarkSequence,
} from "./CoachMarkSequence";
import { ContextualCoachMarks } from "./ContextualCoachMarks";

const OVERVIEW_STEP: CoachStep = {
  topicId: "doi-diem-nhin",
  anchorIds: ["viewpoint"],
  preferredPlacement: "bottom",
};

const GRAPH_STEP: CoachStep = {
  topicId: "dieu-huong-so-do",
  anchorIds: ["graph"],
  preferredPlacement: "left",
};

function createStorage(initial?: unknown) {
  const values = new Map<string, string>();
  if (initial !== undefined) {
    values.set(GUIDANCE_STORAGE_KEY, JSON.stringify(initial));
  }
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  } as unknown as Storage;
  return { storage, values };
}

function SequenceHarness(props: UseCoachMarkSequenceOptions & { className?: string }) {
  const sequence = useCoachMarkSequence(props);
  return (
    <>
      <output
        data-testid={`${props.chapter}-state`}
        data-active={String(sequence.active)}
        data-anchor={sequence.currentAnchorId ?? ""}
        data-topic={sequence.currentTopic?.id ?? ""}
        data-index={String(sequence.index)}
        data-count={String(sequence.count)}
        data-placement={sequence.currentStep?.preferredPlacement ?? ""}
      />
      <CoachMarkCard sequence={sequence} className={props.className} />
    </>
  );
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("CoachMarkSequence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("auto-starts an undecided chapter once and stays closed after completion", async () => {
    const user = userEvent.setup();
    const { storage } = createStorage();
    const view = render(
      <>
        <button type="button" data-guidance-anchor="viewpoint">Đổi người</button>
        <ContextualCoachMarks
          chapter="overview"
          role="reader"
          steps={[OVERVIEW_STEP]}
          enabled
          storage={storage}
        />
      </>,
    );

    expect(await screen.findByRole("dialog", { name: "Hướng dẫn nhanh" })).toBeInTheDocument();
    expect(document.querySelector('[data-coach-layer="overview"]')).toHaveClass(
      "workspace-coach-layer",
      "workspace-coach-layer--overview",
    );
    expect(screen.getByRole("link", { name: "Xem hướng dẫn" })).toHaveAttribute(
      "href",
      "/help#doi-diem-nhin",
    );
    await user.click(screen.getByRole("button", { name: "Hoàn tất" }));
    expect(document.querySelector('[data-coach-layer="overview"]')).not.toBeInTheDocument();
    expect(readGuidanceState(storage).workspaceCoach.chapters.overview).toBe("completed");

    view.unmount();
    render(
      <>
        <button type="button" data-guidance-anchor="viewpoint">Đổi người</button>
        <ContextualCoachMarks
          chapter="overview"
          role="reader"
          steps={[OVERVIEW_STEP]}
          enabled
          storage={storage}
        />
      </>,
    );
    await flushEffects();
    expect(screen.queryByRole("dialog", { name: "Hướng dẫn nhanh" })).not.toBeInTheDocument();
  });

  it("persists chapter decisions independently", async () => {
    const user = userEvent.setup();
    const { storage } = createStorage({
      schemaVersion: 5,
      completed: ["core-tree-open"],
      dismissedTopicVersions: { "doi-diem-nhin": 2 },
      onboardingSkipped: false,
      workspaceCoach: { version: 2, chapters: { overview: "completed" } },
    });
    render(
      <>
        <div data-guidance-anchor="graph" />
        <SequenceHarness
          chapter="graph"
          role="reader"
          steps={[GRAPH_STEP]}
          enabled
          storage={storage}
        />
      </>,
    );

    await user.click(await screen.findByRole("button", { name: "Hoàn tất" }));
    expect(readGuidanceState(storage)).toMatchObject({
      completed: ["core-tree-open"],
      dismissedTopicVersions: { "doi-diem-nhin": 2 },
      workspaceCoach: {
        chapters: { overview: "completed", graph: "completed" },
      },
    });
  });

  it("supports ordered progress and Back without operating the anchors", async () => {
    const user = userEvent.setup();
    const { storage } = createStorage();
    let anchorClicks = 0;
    render(
      <>
        <button type="button" data-guidance-anchor="viewpoint" onClick={() => anchorClicks += 1}>
          Đổi người
        </button>
        <button type="button" data-guidance-anchor="graph" onClick={() => anchorClicks += 1}>
          Điều khiển sơ đồ
        </button>
        <SequenceHarness
          chapter="overview"
          role="reader"
          steps={[OVERVIEW_STEP, GRAPH_STEP]}
          enabled
          storage={storage}
          helpHref="/tro-giup"
        />
      </>,
    );

    expect(await screen.findByText("Đổi người xét")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Quay lại" })).not.toBeInTheDocument();
    expect(screen.getByText("Bước 1 / 2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tiếp theo" }));

    expect(screen.getByText("Tìm người và di chuyển trên sơ đồ")).toBeInTheDocument();
    expect(screen.getByText("Bước 2 / 2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Xem hướng dẫn" })).toHaveAttribute(
      "href",
      "/tro-giup#dieu-huong-so-do",
    );
    await user.click(screen.getByRole("button", { name: "Quay lại" }));

    expect(screen.getByText("Đổi người xét")).toBeInTheDocument();
    expect(anchorClicks).toBe(0);
  });

  it("uses the first eligible visible anchor and drops role-ineligible topics", async () => {
    const { storage } = createStorage();
    const fallbackStep: CoachStep = {
      topicId: "dieu-huong-so-do",
      anchorIds: [
        "missing",
        "inert-anchor",
        "aria-hidden-anchor",
        "hidden-anchor",
        "display-none-anchor",
        "visibility-hidden-anchor",
        "visible-anchor",
      ],
      preferredPlacement: "right",
    };
    const ownerOnlyStep: CoachStep = {
      topicId: "them-quan-he-ro-rang",
      anchorIds: ["owner-action"],
    };
    render(
      <>
        <div inert={"" as unknown as boolean}>
          <button type="button" data-guidance-anchor="inert-anchor">Inert</button>
        </div>
        <div aria-hidden="true">
          <button type="button" data-guidance-anchor="aria-hidden-anchor">Ẩn aria</button>
        </div>
        <button type="button" hidden data-guidance-anchor="hidden-anchor">Ẩn</button>
        <div style={{ display: "none" }}>
          <button type="button" data-guidance-anchor="display-none-anchor">Display none</button>
        </div>
        <div style={{ visibility: "hidden" }}>
          <button type="button" data-guidance-anchor="visibility-hidden-anchor">Visibility hidden</button>
        </div>
        <button type="button" data-guidance-anchor="visible-anchor">Hiện</button>
        <button type="button" data-guidance-anchor="owner-action">Chỉ biên tập</button>
        <SequenceHarness
          chapter="graph"
          role="reader"
          steps={[ownerOnlyStep, fallbackStep]}
          enabled
          storage={storage}
        />
      </>,
    );

    const state = await screen.findByTestId("graph-state");
    await waitFor(() => expect(state).toHaveAttribute("data-active", "true"));
    expect(state).toHaveAttribute("data-count", "1");
    expect(state).toHaveAttribute("data-anchor", "visible-anchor");
    expect(state).toHaveAttribute("data-topic", "dieu-huong-so-do");
    expect(state).toHaveAttribute("data-placement", "right");
    expect(document.querySelector('[data-guidance-anchor="owner-action"]')).not.toHaveAttribute(
      "data-guidance-highlight",
    );
  });

  it("routes generic replay to overview and typed replay only to its matching chapter", async () => {
    const decided = {
      schemaVersion: 5,
      completed: [],
      dismissedTopicVersions: {},
      onboardingSkipped: false,
      workspaceCoach: {
        version: 2,
        chapters: { overview: "completed", graph: "skipped" },
      },
    };
    const { storage } = createStorage(decided);
    const graphView = render(
      <>
        <div data-guidance-anchor="graph" />
        <SequenceHarness
          chapter="graph"
          role="reader"
          steps={[GRAPH_STEP]}
          enabled
          storage={storage}
        />
      </>,
    );
    await flushEffects();
    expect(screen.queryByRole("dialog", { name: "Hướng dẫn nhanh" })).not.toBeInTheDocument();

    act(() => window.dispatchEvent(new Event(GUIDANCE_REOPEN_EVENT)));
    await flushEffects();
    expect(screen.queryByRole("dialog", { name: "Hướng dẫn nhanh" })).not.toBeInTheDocument();

    act(() => reopenGuidanceChapter("graph"));
    expect(await screen.findByRole("dialog", { name: "Hướng dẫn nhanh" })).toBeInTheDocument();
    graphView.unmount();

    render(
      <>
        <div data-guidance-anchor="viewpoint" />
        <SequenceHarness
          chapter="overview"
          role="reader"
          steps={[OVERVIEW_STEP]}
          enabled
          storage={storage}
        />
      </>,
    );
    act(() => reopenGuidanceChapter("graph"));
    await flushEffects();
    expect(screen.queryByRole("dialog", { name: "Hướng dẫn nhanh" })).not.toBeInTheDocument();

    act(() => window.dispatchEvent(new Event(GUIDANCE_REOPEN_EVENT)));
    expect(await screen.findByRole("dialog", { name: "Hướng dẫn nhanh" })).toBeInTheDocument();
  });

  it("persists Escape as a skip for only the active chapter", async () => {
    const user = userEvent.setup();
    const { storage } = createStorage({
      schemaVersion: 5,
      completed: [],
      dismissedTopicVersions: {},
      onboardingSkipped: false,
      workspaceCoach: { version: 2, chapters: { overview: "completed" } },
    });
    render(
      <>
        <div data-guidance-anchor="graph" />
        <SequenceHarness
          chapter="actions"
          role="reader"
          steps={[GRAPH_STEP]}
          enabled
          storage={storage}
        />
      </>,
    );

    await screen.findByRole("dialog", { name: "Hướng dẫn nhanh" });
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Hướng dẫn nhanh" })).not.toBeInTheDocument();
    expect(readGuidanceState(storage).workspaceCoach.chapters).toEqual({
      overview: "completed",
      actions: "skipped",
    });
    expect(document.querySelector('[data-guidance-anchor="graph"]')).not.toHaveAttribute(
      "data-guidance-highlight",
    );
  });

  it("keeps only the most recently opened chapter active", async () => {
    const user = userEvent.setup();
    const { storage } = createStorage();
    render(
      <>
        <div data-guidance-anchor="viewpoint" />
        <div data-guidance-anchor="graph" />
        <SequenceHarness
          chapter="person"
          role="reader"
          steps={[OVERVIEW_STEP]}
          enabled
          storage={storage}
        />
        <SequenceHarness
          chapter="graph"
          role="reader"
          steps={[GRAPH_STEP]}
          enabled
          storage={storage}
        />
      </>,
    );

    await waitFor(() => {
      expect(screen.getAllByRole("dialog", { name: "Hướng dẫn nhanh" })).toHaveLength(1);
    });
    expect(screen.getByTestId("person-state")).toHaveAttribute("data-active", "false");
    expect(screen.getByTestId("graph-state")).toHaveAttribute("data-active", "true");

    await user.keyboard("{Escape}");
    expect(readGuidanceState(storage).workspaceCoach.chapters).toEqual({
      graph: "skipped",
    });

    act(() => reopenGuidanceChapter("person"));
    expect(await screen.findByRole("dialog", { name: "Hướng dẫn nhanh" })).toBeInTheDocument();
    expect(screen.getByTestId("person-state")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("graph-state")).toHaveAttribute("data-active", "false");
  });

  it("focuses Skip once, restores focus, and cleans highlights on step, disable, and unmount", async () => {
    const user = userEvent.setup();
    const { storage } = createStorage();
    const priorFocus = document.createElement("button");
    priorFocus.textContent = "Mở hướng dẫn ngữ cảnh";
    document.body.appendChild(priorFocus);
    const props = {
      chapter: "person" as const,
      role: "reader" as const,
      steps: [OVERVIEW_STEP, GRAPH_STEP],
      storage,
    };

    try {
      const view = render(
        <>
          <button type="button" data-testid="viewpoint-anchor" data-guidance-anchor="viewpoint">Điểm nhìn</button>
          <button type="button" data-testid="graph-anchor" data-guidance-anchor="graph">Sơ đồ</button>
          <ContextualCoachMarks {...props} enabled={false} />
        </>,
      );
      priorFocus.focus();
      view.rerender(
        <>
          <button type="button" data-testid="viewpoint-anchor" data-guidance-anchor="viewpoint">Điểm nhìn</button>
          <button type="button" data-testid="graph-anchor" data-guidance-anchor="graph">Sơ đồ</button>
          <ContextualCoachMarks {...props} enabled />
        </>,
      );

      const skip = await screen.findByRole("button", { name: "Bỏ qua" });
      expect(skip).toHaveFocus();
      const firstAnchor = screen.getByTestId("viewpoint-anchor");
      const secondAnchor = screen.getByTestId("graph-anchor");
      expect(firstAnchor).toHaveAttribute("data-guidance-highlight", "true");
      await user.click(screen.getByRole("button", { name: "Tiếp theo" }));
      expect(firstAnchor).not.toHaveAttribute("data-guidance-highlight");
      expect(secondAnchor).toHaveAttribute("data-guidance-highlight", "true");

      view.rerender(
        <>
          <button type="button" data-testid="viewpoint-anchor" data-guidance-anchor="viewpoint">Điểm nhìn</button>
          <button type="button" data-testid="graph-anchor" data-guidance-anchor="graph">Sơ đồ</button>
          <ContextualCoachMarks {...props} enabled={false} />
        </>,
      );
      expect(screen.queryByRole("dialog", { name: "Hướng dẫn nhanh" })).not.toBeInTheDocument();
      expect(readGuidanceState(storage).workspaceCoach.chapters.person).toBeUndefined();
      expect(secondAnchor).not.toHaveAttribute("data-guidance-highlight");
      expect(priorFocus).toHaveFocus();

      priorFocus.focus();
      view.rerender(
        <>
          <button type="button" data-testid="viewpoint-anchor" data-guidance-anchor="viewpoint">Điểm nhìn</button>
          <button type="button" data-testid="graph-anchor" data-guidance-anchor="graph">Sơ đồ</button>
          <ContextualCoachMarks {...props} enabled />
        </>,
      );
      await screen.findByRole("dialog", { name: "Hướng dẫn nhanh" });
      const activeAnchor = screen.getByTestId("viewpoint-anchor");
      expect(activeAnchor).toHaveAttribute("data-guidance-highlight", "true");
      view.unmount();
      expect(activeAnchor).not.toHaveAttribute("data-guidance-highlight");
      expect(priorFocus).toHaveFocus();
    } finally {
      priorFocus.remove();
    }
  });
});
