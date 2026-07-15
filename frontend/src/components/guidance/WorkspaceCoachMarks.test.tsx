import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GUIDANCE_REOPEN_EVENT,
  readGuidanceState,
  recordWorkspaceCoachStatus,
} from "@/lib/guidance/storage";
import { WorkspaceCoachMarks } from "./WorkspaceCoachMarks";

vi.mock("./GraphOverlayBoundary", () => ({
  useGraphOverlay: () => ({
    safeRect: { left: 0, top: 0, right: 1000, bottom: 800, width: 1000, height: 800 },
    getPlacement: (anchorId: string) => ({
      style: { left: 20, top: 20, width: 340 },
      target: document.querySelector(`[data-guidance-anchor="${anchorId}"]`),
      fallback: false,
    }),
  }),
}));

function Anchors({ canAdd = true }: { canAdd?: boolean }) {
  return (
    <>
      <button data-guidance-anchor="workspace-viewpoint">Đổi người</button>
      <div data-guidance-anchor="workspace-tabs">Danh sách và Sơ đồ</div>
      {canAdd ? <button data-guidance-anchor="workspace-add-relative">Thêm người thân</button> : null}
      <button data-guidance-anchor="graph-navigation">Điều khiển sơ đồ</button>
    </>
  );
}

describe("WorkspaceCoachMarks", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("runs once through available canonical Help topics and records completion", async () => {
    const user = userEvent.setup();
    render(<><Anchors /><WorkspaceCoachMarks role="owner" storage={localStorage} /></>);

    expect(await screen.findByRole("dialog", { name: "Hướng dẫn nhanh" })).toHaveTextContent("Đổi điểm nhìn");
    await user.click(screen.getByRole("button", { name: "Tiếp theo" }));
    expect(screen.getByRole("dialog", { name: "Hướng dẫn nhanh" })).toHaveTextContent("Tìm người và di chuyển trên sơ đồ");
    await user.click(screen.getByRole("button", { name: "Tiếp theo" }));
    expect(screen.getByRole("dialog", { name: "Hướng dẫn nhanh" })).toHaveTextContent("Thêm quan hệ trực tiếp");
    await user.click(screen.getByRole("button", { name: "Hoàn tất" }));

    expect(screen.queryByRole("dialog", { name: "Hướng dẫn nhanh" })).not.toBeInTheDocument();
    expect(readGuidanceState(localStorage).workspaceCoach).toEqual({ version: 1, status: "completed" });
  });

  it("skips unavailable capability steps, persists Escape, and can be reopened manually", async () => {
    const user = userEvent.setup();
    recordWorkspaceCoachStatus("completed", localStorage);
    render(<><Anchors canAdd={false} /><WorkspaceCoachMarks role="reader" storage={localStorage} /></>);

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Hướng dẫn nhanh" })).not.toBeInTheDocument());
    act(() => window.dispatchEvent(new Event(GUIDANCE_REOPEN_EVENT)));
    expect(await screen.findByRole("dialog", { name: "Hướng dẫn nhanh" })).toBeInTheDocument();
    await user.keyboard("{Escape}");

    expect(readGuidanceState(localStorage).workspaceCoach).toEqual({ version: 1, status: "skipped" });
    expect(screen.queryByText("Thêm quan hệ trực tiếp hoặc tên gọi tự khai báo")).not.toBeInTheDocument();
  });

  it("waits while a person panel is open and can be reopened after the panel closes", async () => {
    const { rerender } = render(
      <>
        <div className="tree-workspace__info-panel tree-workspace__info-panel--open" />
        <Anchors />
        <WorkspaceCoachMarks role="owner" storage={localStorage} />
      </>,
    );

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 120));
    });
    expect(screen.queryByRole("dialog", { name: "Hướng dẫn nhanh" })).not.toBeInTheDocument();

    rerender(
      <>
        <div className="tree-workspace__info-panel" />
        <Anchors />
        <WorkspaceCoachMarks role="owner" storage={localStorage} />
      </>,
    );
    act(() => window.dispatchEvent(new Event(GUIDANCE_REOPEN_EVENT)));
    expect(await screen.findByRole("dialog", { name: "Hướng dẫn nhanh" })).toBeInTheDocument();
  });

  it("skips an explicit step when its anchor is unavailable without persisting completion", async () => {
    render(
      <>
        <Anchors />
        <WorkspaceCoachMarks
          role="owner"
          storage={localStorage}
          initialTopicId="doi-diem-nhin"
          anchorOverride="missing-anchor"
        />
      </>,
    );

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 120));
    });
    expect(screen.queryByRole("dialog", { name: "Hướng dẫn nhanh" })).not.toBeInTheDocument();
    expect(readGuidanceState(localStorage).workspaceCoach).toBeNull();
  });
});
