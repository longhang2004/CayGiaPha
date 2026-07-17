import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GUIDANCE_REOPEN_EVENT,
  GUIDANCE_STORAGE_KEY,
  readGuidanceState,
} from "@/lib/guidance/storage";
import { WorkspaceCoachMarks } from "./WorkspaceCoachMarks";

const overlayMock = vi.hoisted(() => ({
  safeRect: {
    left: 0,
    top: 0,
    right: 1000,
    bottom: 800,
    width: 1000,
    height: 800,
  },
  root: null as HTMLElement | null,
  layer: null as HTMLElement | null,
  spotlightLayer: null as HTMLElement | null,
}));

vi.mock("./GraphOverlayBoundary", () => ({
  useGraphOverlay: () => ({
    safeRect: overlayMock.safeRect,
    root: overlayMock.root,
    layer: overlayMock.layer,
    spotlightLayer: overlayMock.spotlightLayer,
  }),
}));

class MockResizeObserver { observe() {} disconnect() {} }

const domRect = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
  width,
  height,
  x: left,
  y: top,
  toJSON: () => ({}),
}) as DOMRect;

interface AnchorProps {
  includeTabs?: boolean;
  personAnchor?: "workspace-person-list" | "graph-person-node";
}

function OverviewAnchors({
  includeTabs = true,
  personAnchor = "workspace-person-list",
}: AnchorProps) {
  return (
    <>
      <header data-guidance-anchor="workspace-context">Xét vai vế theo Nguyễn An</header>
      <button type="button" data-guidance-anchor="workspace-viewpoint">Đổi người xét</button>
      {includeTabs ? <div data-guidance-anchor="workspace-tabs">Danh sách và Sơ đồ</div> : null}
      <button type="button" data-guidance-anchor={personAnchor}>Nguyễn An</button>
      <footer data-guidance-anchor="workspace-actions">Thao tác cây gia phả</footer>
    </>
  );
}

function seedGuidance(chapters: Record<string, "completed" | "skipped">) {
  localStorage.setItem(GUIDANCE_STORAGE_KEY, JSON.stringify({
    schemaVersion: 5,
    completed: ["core-tree-open"],
    dismissedTopicVersions: { "doi-diem-nhin": 2 },
    onboardingSkipped: false,
    workspaceCoach: { version: 2, chapters },
  }));
}

async function waitForOverviewReady() {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  });
}

describe("WorkspaceCoachMarks", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    overlayMock.safeRect = {
      left: 0,
      top: 0,
      right: 1000,
      bottom: 800,
      width: 1000,
      height: 800,
    };
    overlayMock.root?.remove();
    overlayMock.root = document.createElement("div");
    overlayMock.layer = document.createElement("div");
    overlayMock.spotlightLayer = document.createElement("div");
    overlayMock.root.append(overlayMock.spotlightLayer, overlayMock.layer);
    document.body.append(overlayMock.root);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this === overlayMock.root) return domRect(0, 0, 1000, 800);
      if (this === overlayMock.layer) {
        return domRect(
          overlayMock.safeRect.left,
          overlayMock.safeRect.top,
          overlayMock.safeRect.width,
          overlayMock.safeRect.height,
        );
      }
      if (this.classList.contains("workspace-coach")) return domRect(0, 0, 340, 280);
      if (this.hasAttribute("data-guidance-anchor")) return domRect(200, 100, 120, 48);
      return domRect(0, 0, 0, 0);
    });
  });

  it("runs the exact five-step overview and records schema-5 chapter completion", async () => {
    const user = userEvent.setup();
    render(
      <>
        <OverviewAnchors />
        <WorkspaceCoachMarks role="owner" storage={localStorage} helpHref="/prototype/help" />
      </>,
    );

    const expected = [
      ["Tạo, tham gia hoặc mở một cây", "workspace-context", "bottom"],
      ["Đổi người xét", "workspace-viewpoint", "bottom"],
      ["Tìm người và di chuyển trên sơ đồ", "workspace-tabs", "bottom"],
      ["Xem thông tin và cách xưng hô", "workspace-person-list", "right"],
      ["Làm quen với các thao tác trong cây", "workspace-actions", "bottom"],
    ] as const;

    for (const [index, [title, anchorId, placement]] of expected.entries()) {
      const dialog = await screen.findByRole("dialog", { name: "Hướng dẫn nhanh" });
      expect(dialog).toHaveTextContent(title);
      expect(dialog).toHaveTextContent(`Bước ${index + 1} / 5`);
      await waitFor(() => expect(dialog).toHaveAttribute("data-coach-placement", placement));
      expect(document.querySelector(`[data-guidance-anchor="${anchorId}"]`)).toHaveAttribute(
        "data-guidance-highlight",
        "true",
      );
      if (index === 0) {
        expect(screen.getByRole("link", { name: "Xem hướng dẫn" })).toHaveAttribute(
          "href",
          "/prototype/help#tao-hoac-mo-cay",
        );
      }
      await user.click(screen.getByRole("button", {
        name: index === expected.length - 1 ? "Hoàn tất" : "Tiếp theo",
      }));
    }

    expect(screen.queryByRole("dialog", { name: "Hướng dẫn nhanh" })).not.toBeInTheDocument();
    expect(readGuidanceState(localStorage)).toMatchObject({
      schemaVersion: 5,
      workspaceCoach: {
        version: 2,
        chapters: { overview: "completed" },
      },
    });
  });

  it("skips the missing tabs step on split desktop and uses the graph-node person fallback", async () => {
    const user = userEvent.setup();
    render(
      <>
        <OverviewAnchors includeTabs={false} personAnchor="graph-person-node" />
        <WorkspaceCoachMarks role="reader" storage={localStorage} />
      </>,
    );

    const expectedTitles = [
      "Tạo, tham gia hoặc mở một cây",
      "Đổi người xét",
      "Xem thông tin và cách xưng hô",
      "Làm quen với các thao tác trong cây",
    ];
    for (const [index, title] of expectedTitles.entries()) {
      const dialog = await screen.findByRole("dialog", { name: "Hướng dẫn nhanh" });
      expect(dialog).toHaveTextContent(title);
      expect(dialog).toHaveTextContent(`Bước ${index + 1} / 4`);
      await user.click(screen.getByRole("button", {
        name: index === expectedTitles.length - 1 ? "Hoàn tất" : "Tiếp theo",
      }));
    }

    expect(document.querySelector('[data-guidance-anchor="graph-person-node"]')).not.toHaveAttribute(
      "data-guidance-highlight",
    );
  });

  it("keeps a stored overview closed until a generic replay and preserves other chapters", async () => {
    const user = userEvent.setup();
    seedGuidance({ overview: "completed", graph: "completed" });
    render(
      <>
        <OverviewAnchors />
        <WorkspaceCoachMarks role="reader" storage={localStorage} />
      </>,
    );

    await waitForOverviewReady();
    expect(screen.queryByRole("dialog", { name: "Hướng dẫn nhanh" })).not.toBeInTheDocument();

    act(() => window.dispatchEvent(new Event(GUIDANCE_REOPEN_EVENT)));
    expect(await screen.findByRole("dialog", { name: "Hướng dẫn nhanh" })).toHaveTextContent(
      "Tạo, tham gia hoặc mở một cây",
    );
    await user.click(screen.getByRole("button", { name: "Bỏ qua" }));

    expect(readGuidanceState(localStorage).workspaceCoach).toEqual({
      version: 2,
      chapters: { overview: "skipped", graph: "completed" },
    });
  });

  it.each([
    ["person panel", "tree-workspace__info-panel tree-workspace__info-panel--open"],
    ["drawer", "cgp-drawer-overlay"],
  ])("defers for an open %s and starts without persisting when it closes", async (_name, openClass) => {
    const { rerender } = render(
      <>
        <div className={openClass} />
        <OverviewAnchors />
        <WorkspaceCoachMarks role="owner" storage={localStorage} />
      </>,
    );

    await waitForOverviewReady();
    expect(screen.queryByRole("dialog", { name: "Hướng dẫn nhanh" })).not.toBeInTheDocument();
    expect(readGuidanceState(localStorage).workspaceCoach.chapters.overview).toBeUndefined();

    rerender(
      <>
        <div />
        <OverviewAnchors />
        <WorkspaceCoachMarks role="owner" storage={localStorage} />
      </>,
    );

    expect(await screen.findByRole("dialog", { name: "Hướng dẫn nhanh" })).toHaveTextContent(
      "Tạo, tham gia hoặc mở một cây",
    );
  });

  it("forces an explicit canonical topic after readiness even when overview is decided", async () => {
    seedGuidance({ overview: "completed" });
    render(
      <>
        <button type="button" data-guidance-anchor="explicit-viewpoint">Đổi người xét</button>
        <WorkspaceCoachMarks
          role="reader"
          storage={localStorage}
          initialTopicId="doi-diem-nhin"
          anchorOverride="explicit-viewpoint"
          helpHref="/tro-giup"
        />
      </>,
    );

    const dialog = await screen.findByRole("dialog", { name: "Hướng dẫn nhanh" });
    expect(dialog).toHaveTextContent("Đổi người xét");
    expect(dialog).toHaveTextContent("Bước 1 / 1");
    expect(screen.getByRole("link", { name: "Xem hướng dẫn" })).toHaveAttribute(
      "href",
      "/tro-giup#doi-diem-nhin",
    );
    await waitFor(() => expect(dialog).toHaveAttribute("data-coach-placement", "bottom"));
  });

  it("renders and persists nothing when an explicit topic anchor is missing", async () => {
    render(
      <>
        <OverviewAnchors />
        <WorkspaceCoachMarks
          role="owner"
          storage={localStorage}
          initialTopicId="doi-diem-nhin"
          anchorOverride="missing-anchor"
        />
      </>,
    );

    await waitForOverviewReady();
    expect(screen.queryByRole("dialog", { name: "Hướng dẫn nhanh" })).not.toBeInTheDocument();
    expect(readGuidanceState(localStorage).workspaceCoach).toEqual({ version: 2, chapters: {} });
  });

  it("constrains in a compact safe area, but closes when controls cannot fit", async () => {
    const view = render(
      <>
        <OverviewAnchors />
        <WorkspaceCoachMarks role="owner" storage={localStorage} />
      </>,
    );

    expect(await screen.findByRole("dialog", { name: "Hướng dẫn nhanh" })).toBeInTheDocument();
    overlayMock.safeRect = { ...overlayMock.safeRect, bottom: 240, height: 240 };
    view.rerender(
      <>
        <OverviewAnchors />
        <WorkspaceCoachMarks role="owner" storage={localStorage} />
      </>,
    );
    expect(await screen.findByRole("dialog", { name: "Hướng dẫn nhanh" })).toBeInTheDocument();

    overlayMock.safeRect = { ...overlayMock.safeRect, bottom: 100, height: 100 };
    view.rerender(
      <>
        <OverviewAnchors />
        <WorkspaceCoachMarks role="owner" storage={localStorage} />
      </>,
    );
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Hướng dẫn nhanh" })).not.toBeInTheDocument();
    });
    expect(readGuidanceState(localStorage).workspaceCoach.chapters.overview).toBeUndefined();

    overlayMock.safeRect = { ...overlayMock.safeRect, bottom: 800, height: 800 };
    view.rerender(
      <>
        <OverviewAnchors />
        <WorkspaceCoachMarks role="owner" storage={localStorage} />
      </>,
    );
    expect(await screen.findByRole("dialog", { name: "Hướng dẫn nhanh" })).toHaveTextContent(
      "Tạo, tham gia hoặc mở một cây",
    );
  });

  it("does not apply the stretching mobile inset below 520 CSS pixels", async () => {
    overlayMock.safeRect = {
      ...overlayMock.safeRect,
      right: 400,
      width: 400,
    };
    render(
      <>
        <OverviewAnchors />
        <WorkspaceCoachMarks role="reader" storage={localStorage} />
      </>,
    );

    const dialog = await screen.findByRole("dialog", { name: "Hướng dẫn nhanh" });
    await waitFor(() => expect(dialog).toHaveAttribute("data-coach-placement", "bottom"));
    expect(dialog).not.toHaveClass("workspace-coach--mobile");
    expect(dialog.style.bottom).toBe("auto");
    expect(dialog.style.right).toBe("auto");
  });
});
